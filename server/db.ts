import {
  eq,
  or,
  isNull,
  isNotNull,
  and,
  inArray,
  like,
  sql,
} from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  books,
  folders,
  words,
  userProgress,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

type Db = MySql2Database<Record<string, never>> & { $client: mysql.Pool };

let _db: Db | null = null;
let _pool: mysql.Pool | null = null;
const GLOBAL_CACHE_TTL_MS = 30_000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const globalCache = new Map<string, CacheEntry<unknown>>();

function getCachedValue<T>(key: string): T | null {
  const entry = globalCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    globalCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCachedValue<T>(key: string, value: T): T {
  globalCache.set(key, {
    value,
    expiresAt: Date.now() + GLOBAL_CACHE_TTL_MS,
  });
  return value;
}

function invalidateGlobalCache() {
  globalCache.clear();
}

export function resetDbCacheForTests() {
  invalidateGlobalCache();
}

function readPositiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getDbPool() {
  if (!_pool) {
    if (!ENV.databaseUrl) {
      throw new Error("DATABASE_URL is not configured");
    }

    _pool = mysql.createPool({
      uri: ENV.databaseUrl,
      waitForConnections: true,
      connectionLimit: readPositiveIntEnv("DB_POOL_CONNECTION_LIMIT", 10),
      maxIdle: readPositiveIntEnv("DB_POOL_MAX_IDLE", 10),
      idleTimeout: readPositiveIntEnv("DB_POOL_IDLE_TIMEOUT_MS", 60_000),
      queueLimit: readPositiveIntEnv("DB_POOL_QUEUE_LIMIT", 0),
      connectTimeout: readPositiveIntEnv("DB_CONNECT_TIMEOUT_MS", 10_000),
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }

  return _pool;
}

export async function getDb() {
  if (!_db) {
    _db = drizzle<Record<string, never>, mysql.Pool>(getDbPool());
  }

  return _db;
}

export async function closeDbPool() {
  if (!_pool) return;

  await _pool.end();
  _pool = null;
  _db = null;
}

// ----------------------- User queries -----------------------
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId && !user.username) {
    throw new Error("Either user openId or username is required for upsert");
  }

  const db = await getDb();
  try {
    const values: InsertUser = {
      openId: user.openId ?? null,
      username: user.username ?? null,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "username"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId && user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    logger.error("db.user_upsert_failed", {
      message: error instanceof Error ? error.message : String(error),
      openId: user.openId ?? null,
      username: user.username ?? null,
    });
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(input: {
  username: string;
  name?: string | null;
  email?: string | null;
  passwordHash: string;
  passwordSalt: string;
}) {
  const db = await getDb();
  await db.insert(users).values({
    openId: null,
    username: input.username,
    name: input.name ?? null,
    email: input.email ?? null,
    loginMethod: "local",
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    lastSignedIn: new Date(),
  });

  return getUserByUsername(input.username);
}

export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

// ----------------------- Folder queries -----------------------
export async function getFolders(userId: number) {
  const db = await getDb();
  return db.select().from(folders).where(eq(folders.createdBy, userId));
}

export async function getFoldersWithWordCounts(userId: number) {
  const db = await getDb();
  const rows = await db
    .select({
      folder: folders,
      wordCount: sql<number>`count(${words.id})`,
    })
    .from(folders)
    .leftJoin(words, eq(words.folderId, folders.id))
    .where(eq(folders.createdBy, userId))
    .groupBy(
      folders.id,
      folders.name,
      folders.description,
      folders.bookId,
      folders.unitNumber,
      folders.sourceGlobalFolderId,
      folders.createdBy,
      folders.isGlobal,
      folders.createdAt,
      folders.updatedAt
    );

  return rows.map(row => ({
    folder: row.folder,
    wordCount: Number(row.wordCount) || 0,
  }));
}

export async function getSavedGlobalFolderIds(userId: number) {
  const db = await getDb();
  const savedFolders = await db
    .select({ sourceGlobalFolderId: folders.sourceGlobalFolderId })
    .from(folders)
    .where(
      and(
        eq(folders.createdBy, userId),
        isNotNull(folders.sourceGlobalFolderId)
      )
    );

  return savedFolders
    .map(entry => entry.sourceGlobalFolderId)
    .filter((folderId): folderId is number => folderId !== null);
}

async function cloneGlobalFolderToPersonal(
  globalFolderId: number,
  userId: number
) {
  const db = await getDb();
  const globalFolder = await getGlobalFolderById(globalFolderId);
  if (!globalFolder) {
    throw new Error("Global folder not found");
  }

  const existing = await db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.createdBy, userId),
        eq(folders.sourceGlobalFolderId, globalFolderId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  await db.insert(folders).values({
    name: globalFolder.name,
    description: globalFolder.description,
    bookId: globalFolder.bookId,
    unitNumber: globalFolder.unitNumber,
    sourceGlobalFolderId: globalFolder.id,
    createdBy: userId,
    isGlobal: false,
  });

  const createdFolder = await db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.createdBy, userId),
        eq(folders.sourceGlobalFolderId, globalFolderId)
      )
    )
    .limit(1);

  const personalFolder = createdFolder[0];
  if (!personalFolder) {
    throw new Error("Failed to create personal folder copy");
  }

  const globalWords = await getGlobalWordsByFolderId(globalFolderId);

  if (globalWords.length > 0) {
    await db.insert(words).values(
      globalWords.map(word => ({
        folderId: personalFolder.id,
        english: word.english,
        uzbek: word.uzbek,
        description: word.description,
        example: word.example,
        createdBy: userId,
      }))
    );
  }

  return personalFolder;
}

export async function toggleSaveGlobalFolder(
  globalFolderId: number,
  userId: number
) {
  const db = await getDb();
  const existing = await db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.createdBy, userId),
        eq(folders.sourceGlobalFolderId, globalFolderId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await deletePersonalFolder(existing[0].id, userId);
    logger.info("vocabulary.global_folder_save_toggled", {
      userId,
      globalFolderId,
      saved: false,
    });
    return { saved: false };
  }

  await cloneGlobalFolderToPersonal(globalFolderId, userId);
  logger.info("vocabulary.global_folder_save_toggled", {
    userId,
    globalFolderId,
    saved: true,
  });
  return { saved: true };
}

export async function toggleSaveGlobalBook(
  globalBookId: number,
  userId: number
) {
  const db = await getDb();
  const globalBookFolders = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.isGlobal, true), eq(folders.bookId, globalBookId)));

  const folderIds = globalBookFolders.map(folder => folder.id);
  if (folderIds.length === 0) {
    throw new Error("Global book has no folders");
  }

  const savedCopies = await db
    .select({
      id: folders.id,
      sourceGlobalFolderId: folders.sourceGlobalFolderId,
    })
    .from(folders)
    .where(
      and(
        eq(folders.createdBy, userId),
        isNotNull(folders.sourceGlobalFolderId),
        inArray(folders.sourceGlobalFolderId, folderIds)
      )
    );

  const savedSet = new Set(
    savedCopies
      .map(folder => folder.sourceGlobalFolderId)
      .filter((folderId): folderId is number => folderId !== null)
  );
  const allSaved = folderIds.every(folderId => savedSet.has(folderId));

  if (allSaved) {
    for (const savedFolder of savedCopies) {
      await deletePersonalFolder(savedFolder.id, userId);
    }
    logger.info("vocabulary.global_book_save_toggled", {
      userId,
      globalBookId,
      saved: false,
    });
    return { saved: false };
  }

  for (const folderId of folderIds) {
    if (!savedSet.has(folderId)) {
      await cloneGlobalFolderToPersonal(folderId, userId);
    }
  }

  logger.info("vocabulary.global_book_save_toggled", {
    userId,
    globalBookId,
    saved: true,
  });
  return { saved: true };
}

export async function getAllFolders() {
  const cached =
    getCachedValue<(typeof folders.$inferSelect)[]>("global:folders");
  if (cached) return cached;
  const db = await getDb();
  const result = await db
    .select()
    .from(folders)
    .where(eq(folders.isGlobal, true));
  return setCachedValue("global:folders", result);
}

export async function getAllFoldersWithWordCounts() {
  const cached = getCachedValue<
    Array<{ folder: typeof folders.$inferSelect; wordCount: number }>
  >("global:folders-with-counts");
  if (cached) return cached;
  const db = await getDb();
  const rows = await db
    .select({
      folder: folders,
      wordCount: sql<number>`count(${words.id})`,
    })
    .from(folders)
    .leftJoin(words, eq(words.folderId, folders.id))
    .where(eq(folders.isGlobal, true))
    .groupBy(
      folders.id,
      folders.name,
      folders.description,
      folders.bookId,
      folders.unitNumber,
      folders.sourceGlobalFolderId,
      folders.createdBy,
      folders.isGlobal,
      folders.createdAt,
      folders.updatedAt
    );

  return setCachedValue(
    "global:folders-with-counts",
    rows.map(row => ({
      folder: row.folder,
      wordCount: Number(row.wordCount) || 0,
    }))
  );
}

export async function getAllWords() {
  const db = await getDb();
  return db.select().from(words);
}

export async function getFolderById(folderId: number, userId: number) {
  const db = await getDb();
  const result = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.createdBy, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getGlobalFolderById(folderId: number) {
  const db = await getDb();
  const result = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.isGlobal, true)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchGlobalFolderIds(query: string) {
  const db = await getDb();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = `%${trimmed}%`;

  const folderMatches = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.isGlobal, true), like(folders.name, pattern)));

  const wordMatches = await db
    .select({ folderId: words.folderId })
    .from(words)
    .innerJoin(folders, eq(words.folderId, folders.id))
    .where(
      and(
        eq(folders.isGlobal, true),
        or(like(words.english, pattern), like(words.uzbek, pattern))
      )
    );

  const ids = new Set<number>();
  folderMatches.forEach(item => ids.add(item.id));
  wordMatches.forEach(item => ids.add(item.folderId));

  return Array.from(ids);
}

export async function searchGlobalWords(query: string, limit = 20) {
  const db = await getDb();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = `%${trimmed}%`;

  const results = await db
    .select({
      id: words.id,
      english: words.english,
      uzbek: words.uzbek,
      description: words.description,
      example: words.example,
      folderId: folders.id,
      folderName: folders.name,
      bookId: folders.bookId,
      unitNumber: folders.unitNumber,
    })
    .from(words)
    .innerJoin(folders, eq(words.folderId, folders.id))
    .where(
      and(
        eq(folders.isGlobal, true),
        or(
          like(words.english, pattern),
          like(words.uzbek, pattern),
          like(words.description, pattern),
          like(words.example, pattern)
        )
      )
    )
    .limit(limit);

  return results;
}

export async function deletePersonalFolder(folderId: number, userId: number) {
  const db = await getDb();
  const folder = await getFolderById(folderId, userId);
  if (!folder || folder.isGlobal) {
    return { deleted: false };
  }

  await db
    .delete(folders)
    .where(and(eq(folders.id, folderId), eq(folders.createdBy, userId)));

  return { deleted: true };
}

export async function createFolder(
  name: string,
  description: string | null,
  createdBy: number | null,
  options?: {
    bookId?: number | null;
    unitNumber?: number | null;
  }
) {
  const db = await getDb();
  const result = await db.insert(folders).values({
    name,
    description,
    bookId: options?.bookId ?? null,
    unitNumber: options?.unitNumber ?? null,
    createdBy,
    isGlobal: createdBy === null,
  });
  if (createdBy === null) {
    invalidateGlobalCache();
  }
  return result;
}

// ----------------------- Word queries -----------------------
export async function getWordsByFolderId(folderId: number, userId: number) {
  const db = await getDb();
  const folder = await getFolderById(folderId, userId);
  if (!folder) return [];

  return db
    .select()
    .from(words)
    .where(
      and(
        eq(words.folderId, folderId),
        or(isNull(words.createdBy), eq(words.createdBy, userId))
      )
    );
}

export async function getGlobalWordsByFolderId(folderId: number) {
  const cacheKey = `global:folder-words:${folderId}`;
  const cached = getCachedValue<(typeof words.$inferSelect)[]>(cacheKey);
  if (cached) return cached;
  const db = await getDb();
  const folder = await getGlobalFolderById(folderId);
  if (!folder) return [];
  const result = await db
    .select()
    .from(words)
    .where(eq(words.folderId, folderId));
  return setCachedValue(cacheKey, result);
}

export async function createWord(
  folderId: number,
  english: string,
  uzbek: string,
  description: string | null,
  example: string | null,
  createdBy: number | null
) {
  const db = await getDb();
  if (createdBy !== null) {
    const folder = await getFolderById(folderId, createdBy);
    if (!folder) {
      throw new Error("Folder not found");
    }
    if (folder.bookId !== null) {
      throw new Error("Book folders cannot be edited");
    }
  }
  const result = await db.insert(words).values({
    folderId,
    english,
    uzbek,
    description,
    example,
    createdBy,
  });
  if (createdBy === null) {
    invalidateGlobalCache();
  }
  return result;
}

export async function updateWord(
  wordId: number,
  english: string,
  uzbek: string,
  description: string | null,
  example: string | null,
  userId: number
) {
  const db = await getDb();
  const existingWord = await db
    .select()
    .from(words)
    .where(and(eq(words.id, wordId), eq(words.createdBy, userId)))
    .limit(1);

  const word = existingWord[0];
  if (!word) {
    throw new Error("Word not found");
  }

  const folder = await getFolderById(word.folderId, userId);
  if (!folder) {
    throw new Error("Folder not found");
  }

  if (folder.bookId !== null) {
    throw new Error("Book folders cannot be edited");
  }

  await db
    .update(words)
    .set({
      english,
      uzbek,
      description,
      example,
      updatedAt: new Date(),
    })
    .where(and(eq(words.id, wordId), eq(words.createdBy, userId)));

  const updatedWord = await db
    .select()
    .from(words)
    .where(and(eq(words.id, wordId), eq(words.createdBy, userId)))
    .limit(1);

  return updatedWord[0];
}

// ----------------------- User progress queries -----------------------
export async function getUserProgress(userId: number, folderId: number) {
  const db = await getDb();
  const folderWords = await getWordsByFolderId(folderId, userId);
  const wordIds = folderWords.map(w => w.id);

  if (wordIds.length === 0) {
    return { totalWords: 0, knownWords: 0, progress: [] };
  }

  const progress = await db
    .select()
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        inArray(userProgress.wordId, wordIds)
      )
    );

  const knownCount = progress.filter(p => p.known).length;

  return {
    totalWords: folderWords.length,
    knownWords: knownCount,
    progress,
  };
}

export async function updateUserProgress(
  userId: number,
  wordId: number,
  known: boolean
) {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(userProgress)
    .values({
      userId,
      wordId,
      known,
      reviewCount: 1,
      lastReviewedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        known,
        reviewCount: sql`${userProgress.reviewCount} + 1`,
        lastReviewedAt: now,
      },
    });
}

export async function setWordKnownStatus(
  userId: number,
  wordId: number,
  known: boolean
) {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(userProgress)
    .values({
      userId,
      wordId,
      known,
      reviewCount: 1,
      lastReviewedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        known,
        reviewCount: sql`${userProgress.reviewCount} + 1`,
        lastReviewedAt: now,
      },
    });
}

// ----------------------- User profile queries -----------------------
export async function updateUser(
  userId: number,
  data: { name?: string; email?: string }
) {
  const db = await getDb();
  try {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    updateData.updatedAt = new Date();

    await db.update(users).set(updateData).where(eq(users.id, userId));

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    logger.error("db.user_update_failed", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Failed to update profile");
  }
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  await db.delete(users).where(eq(users.id, userId));
  logger.info("auth.account_deleted", { userId });
  return { success: true };
}

export async function getUserTotalStats(userId: number) {
  const db = await getDb();
  const userFolders = await getFolders(userId);

  if (userFolders.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }

  const folderIds = userFolders.map(f => f.id);

  const allWords = await db
    .select()
    .from(words)
    .where(
      and(
        inArray(words.folderId, folderIds),
        or(isNull(words.createdBy), eq(words.createdBy, userId))
      )
    );

  const wordIds = allWords.map(w => w.id);

  if (wordIds.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }

  const progress = await db
    .select()
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        inArray(userProgress.wordId, wordIds)
      )
    );

  const knownCount = progress.filter(p => p.known).length;
  const unknownCount = allWords.length - knownCount;

  return {
    totalWords: allWords.length,
    knownWords: knownCount,
    unknownWords: unknownCount,
  };
}

export async function getGlobalTotalStats(userId: number) {
  const globalFolders = await getAllFolders();
  const globalFolderIds = globalFolders.map(folder => folder.id);
  if (globalFolderIds.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }
  const db = await getDb();
  const allWords = await db
    .select()
    .from(words)
    .where(inArray(words.folderId, globalFolderIds));

  if (allWords.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }

  const wordIds = allWords.map(w => w.id);

  const progress = await db
    .select()
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        inArray(userProgress.wordId, wordIds)
      )
    );
  const knownCount = progress.filter(p => p.known).length;
  const unknownCount = allWords.length - knownCount;
  return {
    totalWords: allWords.length,
    knownWords: knownCount,
    unknownWords: unknownCount,
  };
}

// ----------------------- Bulk word import -----------------------
export async function importWords(
  folderId: number,
  wordsData: Array<{
    english: string;
    uzbek: string;
    description?: string;
    example?: string;
  }>,
  createdBy: number | null
) {
  const db = await getDb();
  if (createdBy !== null) {
    const folder = await getFolderById(folderId, createdBy);
    if (!folder) {
      throw new Error("Folder not found");
    }
    if (folder.bookId !== null) {
      throw new Error("Book folders cannot be edited");
    }
  }
  const values = wordsData.map(word => ({
    folderId,
    english: word.english.trim(),
    uzbek: word.uzbek.trim(),
    description: word.description?.trim() || null,
    example: word.example?.trim() || null,
    createdBy,
  }));

  const result = await db.insert(words).values(values);
  if (createdBy === null) {
    invalidateGlobalCache();
  }
  return result;
}

// ----------------------- Book queries -----------------------
export async function getGlobalBooks() {
  const cached = getCachedValue<(typeof books.$inferSelect)[]>("global:books");
  if (cached) return cached;
  const db = await getDb();
  const result = await db.select().from(books).where(eq(books.isGlobal, true));
  return setCachedValue("global:books", result);
}

export async function createBook(
  title: string,
  description: string | null,
  createdBy: number | null
) {
  const db = await getDb();
  const result = await db.insert(books).values({
    title,
    description,
    createdBy,
    isGlobal: createdBy === null,
  });
  if (createdBy === null) {
    invalidateGlobalCache();
  }
  return result;
}
