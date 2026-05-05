import "dotenv/config";

import type { Request, Response } from "express";
import mysql from "mysql2/promise";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { createSessionToken, hashPassword } from "./_core/auth";
import { COOKIE_NAME, SEVEN_DAYS_MS } from "../shared/const";
import { ENV } from "./_core/env";
import * as db from "./db";
import { books, folders, userProgress } from "../drizzle/schema";

const TEST_USER_PREFIX = "test_user_";
const TEST_BOOK_PREFIX = "TEST_BOOK_";
const TEST_FOLDER_PREFIX = "TEST_FOLDER_";
const TEST_JWT_SECRET = "test_jwt_secret_minimum_32_chars!!";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

type ClearCookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function uniqueId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeRequest(cookieHeader?: string) {
  return {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    protocol: "http",
  } as Request;
}

function makeResponse() {
  const cookieCalls: CookieCall[] = [];
  const clearCookieCalls: ClearCookieCall[] = [];

  const res = {
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookieCalls.push({ name, value, options });
      return res;
    },
    clearCookie(name: string, options: Record<string, unknown>) {
      clearCookieCalls.push({ name, options });
      return res;
    },
  } as unknown as Response;

  return { res, cookieCalls, clearCookieCalls };
}

async function makeCallerForUser(userId: number) {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  return appRouter.createCaller({
    req: makeRequest(),
    res: makeResponse().res,
    user,
  });
}

async function makePublicCaller() {
  return appRouter.createCaller({
    req: makeRequest(),
    res: makeResponse().res,
    user: null,
  });
}

async function createTestUser(label = uniqueId()) {
  const username = `${TEST_USER_PREFIX}${label}`;
  const password = "password123";
  const { hash, salt } = hashPassword(password);

  const user = await db.createLocalUser({
    username,
    passwordHash: hash,
    passwordSalt: salt,
    email: `${label}@example.com`,
    name: label,
  });

  if (!user) {
    throw new Error("Failed to create test user");
  }

  return { user, username, password };
}

async function createPersonalFolder(userId: number, name = `${TEST_FOLDER_PREFIX}${uniqueId()}`, options?: { bookId?: number | null; unitNumber?: number | null }) {
  await db.createFolder(name, "test folder", userId, options);
  const userFolders = await db.getFolders(userId);
  const folder = userFolders.find(entry => entry.name === name);
  if (!folder) {
    throw new Error(`Failed to find personal folder ${name}`);
  }
  return folder.id;
}

async function createGlobalFolderAndGetId(name: string, options?: { bookId?: number | null; unitNumber?: number | null }) {
  await db.createFolder(name, "test global folder", null, options);
  const globalFolders = await db.getAllFolders();
  const folder = globalFolders.find(entry => entry.name === name);
  if (!folder) {
    throw new Error(`Failed to find global folder ${name}`);
  }
  return folder.id;
}

async function createBookAndGetId(title: string, createdBy: number | null) {
  await db.createBook(title, "test book", createdBy);
  const drizzleDb = await db.getDb();
  const result = await drizzleDb
    .select()
    .from(books)
    .where(and(eq(books.title, title), createdBy === null ? eq(books.isGlobal, true) : eq(books.createdBy, createdBy)))
    .limit(1);

  if (!result[0]) {
    throw new Error(`Failed to find book ${title}`);
  }

  return result[0].id;
}

async function createGlobalBookAndUnits(unitCount = 2, wordsPerUnit = 2) {
  const bookTitle = `${TEST_BOOK_PREFIX}${uniqueId()}`;
  const bookId = await createBookAndGetId(bookTitle, null);
  const folderIds: number[] = [];

  for (let unit = 1; unit <= unitCount; unit += 1) {
    const folderId = await createGlobalFolderAndGetId(`${TEST_FOLDER_PREFIX}${uniqueId()}`, {
      bookId,
      unitNumber: unit,
    });
    folderIds.push(folderId);

    for (let index = 0; index < wordsPerUnit; index += 1) {
      await db.createWord(
        folderId,
        `english_${unit}_${index}_${uniqueId()}`,
        `uzbek_${unit}_${index}_${uniqueId()}`,
        null,
        null,
        null
      );
    }
  }

  return { bookId, folderIds };
}

beforeAll(async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  }

  if (!ENV.databaseUrl) {
    throw new Error("DATABASE_URL must be configured for integration tests");
  }
});

beforeEach(async () => {
  db.resetDbCacheForTests();

  const conn = await mysql.createConnection(ENV.databaseUrl);
  try {
    await conn.query("DELETE FROM `books` WHERE `title` LIKE ?", [`${TEST_BOOK_PREFIX}%`]);
    await conn.query("DELETE FROM `folders` WHERE `name` LIKE ? AND `createdBy` IS NULL", [`${TEST_FOLDER_PREFIX}%`]);
    await conn.query("DELETE FROM `users` WHERE `username` LIKE ? OR `openId` LIKE ?", [`${TEST_USER_PREFIX}%`, `${TEST_USER_PREFIX}%`]);
  } finally {
    await conn.end();
  }
});

describe("database integrity", () => {
  it("has a unique index on userProgress(userId, wordId)", async () => {
    const conn = await mysql.createConnection(ENV.databaseUrl);
    try {
      const [rows] = await conn.query(
        `
          SELECT INDEX_NAME, NON_UNIQUE
          FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = 'userProgress'
            AND index_name = 'userProgress_userId_wordId_unique'
        `
      );

      expect(Array.isArray(rows)).toBe(true);
      expect((rows as Array<{ INDEX_NAME: string; NON_UNIQUE: number }>).some(
        row => row.INDEX_NAME === "userProgress_userId_wordId_unique" && row.NON_UNIQUE === 0
      )).toBe(true);
    } finally {
      await conn.end();
    }
  });

  it("deleting a user cascades personal books, folders, words, and progress", async () => {
    const { user } = await createTestUser();
    const bookId = await createBookAndGetId(`${TEST_BOOK_PREFIX}${uniqueId()}`, user.id);
    const bookFolderId = await createPersonalFolder(user.id, `${TEST_FOLDER_PREFIX}${uniqueId()}`, { bookId, unitNumber: 1 });
    const editableFolderId = await createPersonalFolder(user.id, `${TEST_FOLDER_PREFIX}${uniqueId()}`);
    await db.createWord(editableFolderId, `english_${uniqueId()}`, `uzbek_${uniqueId()}`, null, null, user.id);
    const folderWords = await db.getWordsByFolderId(editableFolderId, user.id);
    await db.setWordKnownStatus(user.id, folderWords[0].id, true);

    await db.deleteUser(user.id);

    const drizzleDb = await db.getDb();
    const [remainingBook] = await drizzleDb.select().from(books).where(eq(books.id, bookId));
    const [remainingBookFolder] = await drizzleDb.select().from(folders).where(eq(folders.id, bookFolderId));
    const [remainingEditableFolder] = await drizzleDb.select().from(folders).where(eq(folders.id, editableFolderId));
    const [remainingProgress] = await drizzleDb
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, user.id));

    expect(remainingBook).toBeUndefined();
    expect(remainingBookFolder).toBeUndefined();
    expect(remainingEditableFolder).toBeUndefined();
    expect(remainingProgress).toBeUndefined();
  });
});

describe("auth flow", () => {
  it("signUp creates a user and sets the JWT cookie", async () => {
    const { res, cookieCalls } = makeResponse();
    const caller = appRouter.createCaller({ req: makeRequest(), res, user: null });

    const result = await caller.auth.signUp({
      username: `${TEST_USER_PREFIX}${uniqueId()}`,
      password: "password123",
      name: "Signup Test",
      email: "signup@example.com",
    });

    expect(result.user?.id).toBeTypeOf("number");
    expect(cookieCalls).toHaveLength(1);
    expect(cookieCalls[0]?.name).toBe(COOKIE_NAME);
    expect(cookieCalls[0]?.value).toBeTypeOf("string");
    expect(cookieCalls[0]?.options.maxAge).toBe(SEVEN_DAYS_MS);
  });

  it("signIn succeeds with correct credentials", async () => {
    const { username, password } = await createTestUser();
    const { res, cookieCalls } = makeResponse();
    const caller = appRouter.createCaller({ req: makeRequest(), res, user: null });

    const result = await caller.auth.signIn({ username, password });

    expect(result.user?.username).toBe(username);
    expect(cookieCalls).toHaveLength(1);
    expect(cookieCalls[0]?.options.maxAge).toBe(SEVEN_DAYS_MS);
  });

  it("signIn rejects a wrong password", async () => {
    const { username } = await createTestUser();
    const caller = await makePublicCaller();

    await expect(
      caller.auth.signIn({ username, password: "wrong-password" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("me returns the current user for a valid session", async () => {
    const { user } = await createTestUser();
    const token = await createSessionToken({ userId: user.id, username: user.username ?? user.openId ?? "" });
    const ctx = await createContext({
      req: makeRequest(`${COOKIE_NAME}=${token}`),
      res: makeResponse().res,
    } as never);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result?.id).toBe(user.id);
    expect(result?.username).toBe(user.username);
  });

  it("me returns null without a session", async () => {
    const ctx = await createContext({
      req: makeRequest(),
      res: makeResponse().res,
    } as never);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.me()).resolves.toBeNull();
  });

  it("logout clears the session cookie", async () => {
    const { res, clearCookieCalls } = makeResponse();
    const caller = appRouter.createCaller({ req: makeRequest(), res, user: null });

    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(clearCookieCalls).toHaveLength(1);
    expect(clearCookieCalls[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("folder CRUD", () => {
  it("createFolder makes the folder visible in getFolders", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);

    await caller.vocabulary.createFolder({ name: `${TEST_FOLDER_PREFIX}${uniqueId()}`, description: "desc" });
    const result = await caller.vocabulary.getFolders();

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toContain(TEST_FOLDER_PREFIX);
  });

  it("getFolderById returns the requested folder", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);

    const folder = await caller.vocabulary.getFolderById({ folderId });

    expect(folder?.id).toBe(folderId);
  });

  it("deleteFolder removes the folder from the user list", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);

    await caller.vocabulary.deleteFolder({ folderId });
    const foldersList = await caller.vocabulary.getFolders();

    expect(foldersList).toHaveLength(0);
  });

  it("does not allow a non-owner to delete another user's folder", async () => {
    const { user: owner } = await createTestUser("owner");
    const { user: otherUser } = await createTestUser("other");
    const ownerFolderId = await createPersonalFolder(owner.id);
    const caller = await makeCallerForUser(otherUser.id);

    const result = await caller.vocabulary.deleteFolder({ folderId: ownerFolderId });

    expect(result.deleted).toBe(false);
    const ownerFolders = await db.getFolders(owner.id);
    expect(ownerFolders).toHaveLength(1);
  });
});

describe("word management", () => {
  it("addWord stores a word that appears in getWords", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);

    await caller.vocabulary.addWord({
      folderId,
      english: "hello",
      uzbek: "salom",
      description: "greeting",
      example: "hello world",
    });
    const result = await caller.vocabulary.getWords({ folderId });

    expect(result).toEqual([
      expect.objectContaining({
        english: "hello",
        uzbek: "salom",
      }),
    ]);
  });

  it("updateWord persists changes", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);
    await db.createWord(folderId, "old", "eski", null, null, user.id);
    const existingWord = await caller.vocabulary.getWords({ folderId });

    await caller.vocabulary.updateWord({
      wordId: existingWord[0].id,
      english: "new",
      uzbek: "yangi",
      description: "updated",
      example: "new example",
    });

    const updated = await caller.vocabulary.getWords({ folderId });
    expect(updated[0]).toEqual(
      expect.objectContaining({
        english: "new",
        uzbek: "yangi",
        description: "updated",
        example: "new example",
      })
    );
  });

  it("importWords saves up to 100 words", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);

    await caller.vocabulary.importWords({
      folderId,
      words: Array.from({ length: 100 }, (_, index) => ({
        english: `english_${index}`,
        uzbek: `uzbek_${index}`,
        description: `desc_${index}`,
        example: `example_${index}`,
      })),
    });

    const result = await caller.vocabulary.getWords({ folderId });
    expect(result).toHaveLength(100);
  });

  it("importWords rejects payloads over 100 words", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);

    await expect(
      caller.vocabulary.importWords({
        folderId,
        words: Array.from({ length: 101 }, (_, index) => ({
          english: `english_${index}`,
          uzbek: `uzbek_${index}`,
        })),
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("progress", () => {
  it("setKnownStatus marks a word known and increments reviewCount", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);
    await db.createWord(folderId, "known", "biladi", null, null, user.id);
    const [word] = await caller.vocabulary.getWords({ folderId });

    await caller.vocabulary.setKnownStatus({ wordId: word.id, known: true });
    const progress = await caller.vocabulary.getProgress({ folderId });

    expect(progress.knownWords).toBe(1);
    expect(progress.progress).toEqual([
      expect.objectContaining({
        wordId: word.id,
        known: true,
        reviewCount: 1,
      }),
    ]);
  });

  it("setKnownStatus can mark a word unknown and increments reviewCount again", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);
    await db.createWord(folderId, "word", "soz", null, null, user.id);
    const [word] = await caller.vocabulary.getWords({ folderId });

    await caller.vocabulary.setKnownStatus({ wordId: word.id, known: true });
    await caller.vocabulary.setKnownStatus({ wordId: word.id, known: false });
    const progress = await caller.vocabulary.getProgress({ folderId });

    expect(progress.knownWords).toBe(0);
    expect(progress.progress[0]).toEqual(
      expect.objectContaining({
        wordId: word.id,
        known: false,
        reviewCount: 2,
      })
    );
  });

  it("getProgress returns the correct knownWords count", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);
    await db.createWord(folderId, "one", "bir", null, null, user.id);
    await db.createWord(folderId, "two", "ikki", null, null, user.id);
    const [firstWord, secondWord] = await caller.vocabulary.getWords({ folderId });

    await caller.vocabulary.setKnownStatus({ wordId: firstWord.id, known: true });
    await caller.vocabulary.setKnownStatus({ wordId: secondWord.id, known: false });

    const progress = await caller.vocabulary.getProgress({ folderId });
    expect(progress.totalWords).toBe(2);
    expect(progress.knownWords).toBe(1);
  });

  it("duplicate progress upserts update a single row instead of inserting duplicates", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);
    await db.createWord(folderId, "dup", "takror", null, null, user.id);
    const [word] = await caller.vocabulary.getWords({ folderId });

    await caller.vocabulary.updateProgress({ wordId: word.id, known: true });
    await caller.vocabulary.updateProgress({ wordId: word.id, known: false });

    const drizzleDb = await db.getDb();
    const rows = await drizzleDb
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, user.id), eq(userProgress.wordId, word.id)));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        known: false,
        reviewCount: 2,
      })
    );
  });
});

describe("global save and clone", () => {
  it("toggleSaveGlobalFolder clones a global folder and its words", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const { folderIds } = await createGlobalBookAndUnits(1, 2);
    const globalFolderId = folderIds[0];

    await caller.vocabulary.toggleSaveGlobalFolder({ folderId: globalFolderId });

    const savedFolders = await db.getFolders(user.id);
    expect(savedFolders).toHaveLength(1);
    expect(savedFolders[0]?.sourceGlobalFolderId).toBe(globalFolderId);

    const clonedWords = await db.getWordsByFolderId(savedFolders[0].id, user.id);
    expect(clonedWords).toHaveLength(2);
  });

  it("toggleSaveGlobalBook clones all units under the book", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const { bookId, folderIds } = await createGlobalBookAndUnits(3, 1);

    await caller.vocabulary.toggleSaveGlobalBook({ bookId });

    const savedFolders = await db.getFolders(user.id);
    expect(savedFolders).toHaveLength(3);
    expect(savedFolders.map(folder => folder.sourceGlobalFolderId).sort()).toEqual(folderIds.sort());
  });

  it("getSavedGlobalFolderIds returns saved source folder ids", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const { folderIds } = await createGlobalBookAndUnits(2, 1);

    await caller.vocabulary.toggleSaveGlobalFolder({ folderId: folderIds[0] });
    await caller.vocabulary.toggleSaveGlobalFolder({ folderId: folderIds[1] });

    const savedIds = await caller.vocabulary.getSavedGlobalFolderIds();
    expect(savedIds.sort()).toEqual(folderIds.sort());
  });
});

describe("stats derivation", () => {
  it("getTotalStats returns total, known, and unknown counts", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const folderId = await createPersonalFolder(user.id);

    await db.createWord(folderId, "one", "bir", null, null, user.id);
    await db.createWord(folderId, "two", "ikki", null, null, user.id);
    await db.createWord(folderId, "three", "uch", null, null, user.id);
    const createdWords = await caller.vocabulary.getWords({ folderId });

    await caller.vocabulary.setKnownStatus({ wordId: createdWords[0].id, known: true });
    await caller.vocabulary.setKnownStatus({ wordId: createdWords[1].id, known: false });

    const stats = await caller.auth.getTotalStats();

    expect(stats).toEqual({
      totalWords: 3,
      knownWords: 1,
      unknownWords: 2,
    });
  });
});

describe("book units personal counts", () => {
  it("returns counted personal units for saved book folders", async () => {
    const { user } = await createTestUser();
    const caller = await makeCallerForUser(user.id);
    const { bookId } = await createGlobalBookAndUnits(2, 3);

    await caller.vocabulary.toggleSaveGlobalBook({ bookId });

    const personalUnits = await caller.vocabulary.getFoldersWithCounts();
    const savedUnits = personalUnits.filter(entry => entry.folder.bookId === bookId);

    expect(savedUnits).toHaveLength(2);
    expect(savedUnits.map(entry => entry.wordCount)).toEqual([3, 3]);
  });
});
