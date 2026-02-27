import { eq, or, isNull, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  folders,
  words,
  userProgress,
  type User,
  type Folder,
  type Word,
  type UserProgress,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { promises as fs } from "fs";
import path from "path";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// -------- File-backed store (used when DATABASE_URL is not set) --------
const DATA_DIR = process.env.LOCAL_DATA_DIR || "data";
const DATA_FILE = path.resolve(process.cwd(), DATA_DIR, "db.json");

type Store = {
  nextIds: {
    users: number;
    folders: number;
    words: number;
    userProgress: number;
  };
  users: User[];
  folders: Folder[];
  words: Word[];
  userProgress: UserProgress[];
};

let storeCache: Store | null = null;
let storeLoading: Promise<Store> | null = null;

function reviveDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function reviveUser(raw: any): User {
  return {
    ...raw,
    createdAt: reviveDate(raw.createdAt) ?? new Date(),
    updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
    lastSignedIn: reviveDate(raw.lastSignedIn) ?? new Date(),
  } as User;
}

function reviveFolder(raw: any): Folder {
  return {
    ...raw,
    createdAt: reviveDate(raw.createdAt) ?? new Date(),
    updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
  } as Folder;
}

function reviveWord(raw: any): Word {
  return {
    ...raw,
    createdAt: reviveDate(raw.createdAt) ?? new Date(),
    updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
  } as Word;
}

function reviveProgress(raw: any): UserProgress {
  return {
    ...raw,
    createdAt: reviveDate(raw.createdAt) ?? new Date(),
    updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
    lastReviewedAt: reviveDate(raw.lastReviewedAt),
  } as UserProgress;
}

async function loadStore(): Promise<Store> {
  if (storeCache) return storeCache;
  if (storeLoading) return storeLoading;

  storeLoading = (async () => {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      const store: Store = {
        nextIds: parsed.nextIds ?? {
          users: 1,
          folders: 1,
          words: 1,
          userProgress: 1,
        },
        users: Array.isArray(parsed.users)
          ? parsed.users.map(reviveUser)
          : [],
        folders: Array.isArray(parsed.folders)
          ? parsed.folders.map(reviveFolder)
          : [],
        words: Array.isArray(parsed.words)
          ? parsed.words.map(reviveWord)
          : [],
        userProgress: Array.isArray(parsed.userProgress)
          ? parsed.userProgress.map(reviveProgress)
          : [],
      };

      storeCache = store;
      return store;
    } catch (error) {
      const store: Store = {
        nextIds: { users: 1, folders: 1, words: 1, userProgress: 1 },
        users: [],
        folders: [],
        words: [],
        userProgress: [],
      };
      storeCache = store;
      await persistStore(store);
      return store;
    } finally {
      storeLoading = null;
    }
  })();

  return storeLoading;
}

async function persistStore(store: Store) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const data = JSON.stringify(store, null, 2);
  await fs.writeFile(DATA_FILE, data, "utf8");
}

// ----------------------- User queries -----------------------
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (db) {
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
      return;
    } catch (error) {
      console.error("[Database] Failed to upsert user:", error);
      throw error;
    }
  }

  const store = await loadStore();
  const existingIndex = store.users.findIndex(u => u.openId === user.openId);
  const now = new Date();

  if (existingIndex >= 0) {
    const existing = store.users[existingIndex];
    const updated: User = {
      ...existing,
      name: user.name ?? existing.name,
      email: user.email ?? existing.email,
      loginMethod: user.loginMethod ?? existing.loginMethod,
      role: user.role ?? existing.role,
      lastSignedIn: user.lastSignedIn ?? now,
      updatedAt: now,
    } as User;
    store.users[existingIndex] = updated;
  } else {
    const newUser: User = {
      id: store.nextIds.users++,
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      createdAt: now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? now,
    } as User;
    store.users.push(newUser);
  }

  await persistStore(store);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (db) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  }

  const store = await loadStore();
  return store.users.find(u => u.openId === openId);
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (db) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  const store = await loadStore();
  return store.users.find(u => u.id === userId);
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
  if (db) {
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

  const store = await loadStore();
  const now = new Date();
  const user: User = {
    id: store.nextIds.users++,
    openId: input.username,
    name: input.name ?? null,
    email: input.email ?? null,
    loginMethod: "password",
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  } as User;
  store.users.push(user);
  await persistStore(store);
  return user;
}

export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  if (db) {
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, userId));
    return;
  }

  const store = await loadStore();
  const user = store.users.find(u => u.id === userId);
  if (user) {
    user.lastSignedIn = new Date();
    user.updatedAt = new Date();
    await persistStore(store);
  }
}

// ----------------------- Folder queries -----------------------
export async function getFolders(userId: number) {
  const db = await getDb();
  if (db) {
    return db.select().from(folders).where(
      or(eq(folders.isGlobal, true), eq(folders.createdBy, userId))
    );
  }

  const store = await loadStore();
  return store.folders.filter(
    f => f.isGlobal || f.createdBy === userId
  );
}

export async function getFolderById(folderId: number, userId: number) {
  const db = await getDb();
  if (db) {
    const result = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.id, folderId),
          or(eq(folders.isGlobal, true), eq(folders.createdBy, userId))
        )
      )
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  }

  const store = await loadStore();
  return store.folders.find(
    f => f.id === folderId && (f.isGlobal || f.createdBy === userId)
  );
}

export async function createFolder(
  name: string,
  description: string | null,
  createdBy: number | null
) {
  const db = await getDb();
  if (db) {
    return db.insert(folders).values({
      name,
      description,
      createdBy,
      isGlobal: createdBy === null,
    });
  }

  const store = await loadStore();
  const now = new Date();
  const folder: Folder = {
    id: store.nextIds.folders++,
    name,
    description: description ?? null,
    createdBy,
    isGlobal: createdBy === null,
    createdAt: now,
    updatedAt: now,
  } as Folder;
  store.folders.push(folder);
  await persistStore(store);
  return folder;
}

// ----------------------- Word queries -----------------------
export async function getWordsByFolderId(folderId: number, userId: number) {
  const db = await getDb();
  if (db) {
    // First check if user has access to the folder
    const folder = await getFolderById(folderId, userId);
    if (!folder) return [];

    // Get words from the folder (both admin and user's own words)
    return db.select().from(words).where(
      and(
        eq(words.folderId, folderId),
        or(isNull(words.createdBy), eq(words.createdBy, userId))
      )
    );
  }

  const store = await loadStore();
  const folder = await getFolderById(folderId, userId);
  if (!folder) return [];
  return store.words.filter(
    w =>
      w.folderId === folderId &&
      (w.createdBy === null || w.createdBy === userId)
  );
}

export async function createWord(
  folderId: number,
  english: string,
  uzbek: string,
  example: string | null,
  createdBy: number | null
) {
  const db = await getDb();
  if (db) {
    return db.insert(words).values({
      folderId,
      english,
      uzbek,
      example,
      createdBy,
    });
  }

  const store = await loadStore();
  const now = new Date();
  const word: Word = {
    id: store.nextIds.words++,
    folderId,
    english,
    uzbek,
    example: example ?? null,
    createdBy,
    createdAt: now,
    updatedAt: now,
  } as Word;
  store.words.push(word);
  await persistStore(store);
  return word;
}

// ----------------------- User progress queries -----------------------
export async function getUserProgress(userId: number, folderId: number) {
  const db = await getDb();
  if (db) {
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

  const store = await loadStore();
  const folderWords = await getWordsByFolderId(folderId, userId);
  const wordIds = folderWords.map(w => w.id);
  if (wordIds.length === 0) {
    return { totalWords: 0, knownWords: 0, progress: [] };
  }

  const progress = store.userProgress.filter(
    p => p.userId === userId && wordIds.includes(p.wordId)
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
  if (db) {
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
    return;
  }

  const store = await loadStore();
  const existing = store.userProgress.find(
    p => p.userId === userId && p.wordId === wordId
  );
  if (existing) {
    existing.known = known;
    existing.reviewCount += 1;
    existing.lastReviewedAt = new Date();
    existing.updatedAt = new Date();
  } else {
    const now = new Date();
    const progress: UserProgress = {
      id: store.nextIds.userProgress++,
      userId,
      wordId,
      known,
      reviewCount: 1,
      lastReviewedAt: now,
      createdAt: now,
      updatedAt: now,
    } as UserProgress;
    store.userProgress.push(progress);
  }
  await persistStore(store);
}

// ----------------------- User profile queries -----------------------
export async function updateUser(
  userId: number,
  data: { name?: string; email?: string }
) {
  const db = await getDb();
  if (db) {
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
      console.error("[Database] Failed to update user:", error);
      throw new Error("Failed to update profile");
    }
  }

  const store = await loadStore();
  const user = store.users.find(u => u.id === userId);
  if (!user) return undefined;

  if (data.name !== undefined) user.name = data.name;
  if (data.email !== undefined) user.email = data.email;
  user.updatedAt = new Date();
  await persistStore(store);
  return user;
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (db) {
    await db.delete(userProgress).where(eq(userProgress.userId, userId));
    await db.delete(words).where(eq(words.createdBy, userId));
    await db.delete(folders).where(eq(folders.createdBy, userId));
    await db.delete(users).where(eq(users.id, userId));
    return { success: true };
  }

  const store = await loadStore();
  store.userProgress = store.userProgress.filter(p => p.userId !== userId);
  store.words = store.words.filter(w => w.createdBy !== userId);
  store.folders = store.folders.filter(f => f.createdBy !== userId);
  store.users = store.users.filter(u => u.id !== userId);
  await persistStore(store);
  return { success: true };
}

export async function getUserTotalStats(userId: number) {
  const db = await getDb();
  if (db) {
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

  const store = await loadStore();
  const userFolders = await getFolders(userId);
  if (userFolders.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }

  const folderIds = userFolders.map(f => f.id);
  const allWords = store.words.filter(
    w => folderIds.includes(w.folderId) && (w.createdBy === null || w.createdBy === userId)
  );

  if (allWords.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }

  const wordIds = allWords.map(w => w.id);
  const progress = store.userProgress.filter(
    p => p.userId === userId && wordIds.includes(p.wordId)
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
  wordsData: Array<{ english: string; uzbek: string; example?: string }>,
  createdBy: number | null
) {
  const db = await getDb();
  if (db) {
    const values = wordsData.map(word => ({
      folderId,
      english: word.english.trim(),
      uzbek: word.uzbek.trim(),
      example: word.example?.trim() || null,
      createdBy,
    }));

    const result = await db.insert(words).values(values);
    return result;
  }

  const store = await loadStore();
  const now = new Date();
  const values = wordsData.map(word =>
    ({
      id: store.nextIds.words++,
      folderId,
      english: word.english.trim(),
      uzbek: word.uzbek.trim(),
      example: word.example?.trim() || null,
      createdBy,
      createdAt: now,
      updatedAt: now,
    } as Word)
  );
  store.words.push(...values);
  await persistStore(store);
  return values;
}
