import { eq, or, isNull, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, folders, words, userProgress } from "../drizzle/schema";
import { ENV } from './_core/env';

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

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
      values.role = 'admin';
      updateSet.role = 'admin';
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
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Folder queries
export async function getFolders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get admin folders (global) and user's own folders
  return db.select().from(folders).where(
    or(
      isNull(folders.createdBy),
      eq(folders.createdBy, userId)
    )
  );
}

export async function getFolderById(folderId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(folders).where(
    and(
      eq(folders.id, folderId),
      or(
        isNull(folders.createdBy),
        eq(folders.createdBy, userId)
      )
    )
  ).limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createFolder(name: string, description: string | null, createdBy: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(folders).values({
    name,
    description,
    createdBy,
    isGlobal: createdBy === null,
  });
  
  return result;
}

// Word queries
export async function getWordsByFolderId(folderId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // First check if user has access to the folder
  const folder = await getFolderById(folderId, userId);
  if (!folder) return [];
  
  // Get words from the folder (both admin and user's own words)
  return db.select().from(words).where(
    and(
      eq(words.folderId, folderId),
      or(
        isNull(words.createdBy),
        eq(words.createdBy, userId)
      )
    )
  );
}

export async function createWord(folderId: number, english: string, uzbek: string, example: string | null, createdBy: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(words).values({
    folderId,
    english,
    uzbek,
    example,
    createdBy,
  });
  
  return result;
}

// User progress queries
export async function getUserProgress(userId: number, folderId: number) {
  const db = await getDb();
  if (!db) return { totalWords: 0, knownWords: 0, progress: [] };
  
  // Get all words in the folder that the user has access to
  const folderWords = await getWordsByFolderId(folderId, userId);
  const wordIds = folderWords.map(w => w.id);
  
  if (wordIds.length === 0) {
    return { totalWords: 0, knownWords: 0, progress: [] };
  }
  
  // Get user's progress for these words
  const progress = await db.select().from(userProgress).where(
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

export async function updateUserProgress(userId: number, wordId: number, known: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if progress record exists
  const existing = await db.select().from(userProgress).where(
    and(
      eq(userProgress.userId, userId),
      eq(userProgress.wordId, wordId)
    )
  ).limit(1);
  
  if (existing.length > 0) {
    // Update existing record
    await db.update(userProgress).set({
      known,
      reviewCount: existing[0].reviewCount + 1,
      lastReviewedAt: new Date(),
    }).where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.wordId, wordId)
      )
    );
  } else {
    // Create new record
    await db.insert(userProgress).values({
      userId,
      wordId,
      known,
      reviewCount: 1,
      lastReviewedAt: new Date(),
    });
  }
}

// User profile queries
export async function updateUser(userId: number, data: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  updateData.updatedAt = new Date();
  
  await db.update(users).set(updateData).where(eq(users.id, userId));
  
  // Return updated user
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all user's progress records
  await db.delete(userProgress).where(eq(userProgress.userId, userId));
  
  // Delete all user's words
  await db.delete(words).where(eq(words.createdBy, userId));
  
  // Delete all user's folders
  await db.delete(folders).where(eq(folders.createdBy, userId));
  
  // Delete the user
  await db.delete(users).where(eq(users.id, userId));
  
  return { success: true };
}


export async function getUserTotalStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  
  // Get all folders accessible to the user
  const userFolders = await getFolders(userId);
  
  if (userFolders.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }
  
  const folderIds = userFolders.map(f => f.id);
  
  // Get all words in all accessible folders
  const allWords = await db.select().from(words).where(
    and(
      inArray(words.folderId, folderIds),
      or(
        isNull(words.createdBy),
        eq(words.createdBy, userId)
      )
    )
  );
  
  const wordIds = allWords.map(w => w.id);
  
  if (wordIds.length === 0) {
    return { totalWords: 0, knownWords: 0, unknownWords: 0 };
  }
  
  // Get user's progress for these words
  const progress = await db.select().from(userProgress).where(
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
