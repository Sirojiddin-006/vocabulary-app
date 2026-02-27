import { eq, or, isNull, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, books, folders, words, userProgress } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    if (!ENV.databaseUrl) {
      throw new Error("DATABASE_URL is not configured");
    }
    _db = drizzle(ENV.databaseUrl);
  }
  return _db;
}

// ----------------------- User queries -----------------------
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
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
    } else if (user.openId === ENV.ownerOpenId) {
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
    console.error("[Database] Failed to upsert user:", error);
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
  return getUserByOpenId(username);
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
    openId: input.username,
    name: input.name ?? null,
    email: input.email ?? null,
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

export async function getAllFolders() {
  const db = await getDb();
  return db.select().from(folders).where(eq(folders.isGlobal, true));
}

export async function getAllFoldersWithWordCounts() {
  const db = await getDb();
  const allFolders = await getAllFolders();
  const allWords = await db.select().from(words);
  const counts = new Map<number, number>();
  allWords.forEach(word => {
    counts.set(word.folderId, (counts.get(word.folderId) ?? 0) + 1);
  });
  return allFolders.map(folder => ({
    folder,
    wordCount: counts.get(folder.id) ?? 0,
  }));
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
    .where(
      and(
        eq(folders.id, folderId),
        eq(folders.createdBy, userId)
      )
    )
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
  return db.insert(folders).values({
    name,
    description,
    bookId: options?.bookId ?? null,
    unitNumber: options?.unitNumber ?? null,
    createdBy,
    isGlobal: createdBy === null,
  });
}

// ----------------------- Word queries -----------------------
export async function getWordsByFolderId(folderId: number, userId: number) {
  const db = await getDb();
  const folder = await getFolderById(folderId, userId);
  if (!folder) return [];

  return db.select().from(words).where(
    and(
      eq(words.folderId, folderId),
      or(isNull(words.createdBy), eq(words.createdBy, userId))
    )
  );
}

export async function getGlobalWordsByFolderId(folderId: number) {
  const db = await getDb();
  const folder = await getGlobalFolderById(folderId);
  if (!folder) return [];
  return db.select().from(words).where(eq(words.folderId, folderId));
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
  return db.insert(words).values({
    folderId,
    english,
    uzbek,
    description,
    example,
    createdBy,
  });
}

// ----------------------- User progress queries -----------------------
export async function getUserProgress(userId: number, folderId: number) {
  const db = await getDb();
  const folderWords = await getWordsByFolderId(folderId, userId);
  const wordIds = folderWords.map(w => w.id);

  if (wordIds.length === 0) {
    return { totalWords: 0, knownWords: 0, progress: [] };
  }

  const progress = await db.select().from(userProgress).where(
    and(eq(userProgress.userId, userId), inArray(userProgress.wordId, wordIds))
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
  const existing = await db
    .select()
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.wordId, wordId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userProgress)
      .set({
        known,
        reviewCount: existing[0].reviewCount + 1,
        lastReviewedAt: new Date(),
      })
      .where(and(eq(userProgress.userId, userId), eq(userProgress.wordId, wordId)));
  } else {
    await db.insert(userProgress).values({
      userId,
      wordId,
      known,
      reviewCount: 1,
      lastReviewedAt: new Date(),
    });
  }
}

// ----------------------- User profile queries -----------------------
export async function updateUser(userId: number, data: { name?: string; email?: string }) {
  const db = await getDb();
  try {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    updateData.updatedAt = new Date();

    await db.update(users).set(updateData).where(eq(users.id, userId));

    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to update user:", error);
    throw new Error("Failed to update profile");
  }
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  await db.delete(userProgress).where(eq(userProgress.userId, userId));
  await db.delete(words).where(eq(words.createdBy, userId));
  await db.delete(folders).where(eq(folders.createdBy, userId));
  await db.delete(users).where(eq(users.id, userId));
  return { success: true };
}

export async function getUserTotalStats(userId: number) {
  const db = await getDb();
  const userFolders = await getFolders(userId);

  if (userFolders.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }

  const folderIds = userFolders.map(f => f.id);

  const allWords = await db.select().from(words).where(
    and(
      inArray(words.folderId, folderIds),
      or(isNull(words.createdBy), eq(words.createdBy, userId))
    )
  );

  const wordIds = allWords.map(w => w.id);

  if (wordIds.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }

  const progress = await db.select().from(userProgress).where(
    and(eq(userProgress.userId, userId), inArray(userProgress.wordId, wordIds))
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

  const progress = await db.select().from(userProgress).where(
    and(eq(userProgress.userId, userId), inArray(userProgress.wordId, wordIds))
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
  wordsData: Array<{ english: string; uzbek: string; description?: string; example?: string }>,
  createdBy: number | null
) {
  const db = await getDb();
  const values = wordsData.map(word => ({
    folderId,
    english: word.english.trim(),
    uzbek: word.uzbek.trim(),
    description: word.description?.trim() || null,
    example: word.example?.trim() || null,
    createdBy,
  }));

  const result = await db.insert(words).values(values);
  return result;
}

// ----------------------- Book queries -----------------------
export async function getGlobalBooks() {
  const db = await getDb();
  return db.select().from(books).where(eq(books.isGlobal, true));
}

export async function createBook(
  title: string,
  description: string | null,
  createdBy: number | null
) {
  const db = await getDb();
  return db.insert(books).values({
    title,
    description,
    createdBy,
    isGlobal: createdBy === null,
  });
}
