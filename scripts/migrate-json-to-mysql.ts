import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  folders,
  words,
  userProgress,
  type User,
  type Folder,
  type Word,
  type UserProgress,
} from "../drizzle/schema";

const DATA_FILE = path.resolve(process.cwd(), "data", "db.json");

type Store = {
  users: User[];
  folders: Folder[];
  words: Word[];
  userProgress: UserProgress[];
};

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
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    users: Array.isArray(parsed.users) ? parsed.users.map(reviveUser) : [],
    folders: Array.isArray(parsed.folders) ? parsed.folders.map(reviveFolder) : [],
    words: Array.isArray(parsed.words) ? parsed.words.map(reviveWord) : [],
    userProgress: Array.isArray(parsed.userProgress)
      ? parsed.userProgress.map(reviveProgress)
      : [],
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const db = drizzle(url);
  const store = await loadStore();

  if (store.users.length) {
    await db.insert(users).values(store.users).onDuplicateKeyUpdate({
      set: {
        name: users.name,
        email: users.email,
        loginMethod: users.loginMethod,
        role: users.role,
        passwordHash: users.passwordHash,
        passwordSalt: users.passwordSalt,
        updatedAt: users.updatedAt,
        lastSignedIn: users.lastSignedIn,
      },
    });
  }

  if (store.folders.length) {
    await db.insert(folders).values(store.folders).onDuplicateKeyUpdate({
      set: {
        name: folders.name,
        description: folders.description,
        bookId: folders.bookId,
        unitNumber: folders.unitNumber,
        createdBy: folders.createdBy,
        isGlobal: folders.isGlobal,
        updatedAt: folders.updatedAt,
      },
    });
  }

  if (store.words.length) {
    await db.insert(words).values(store.words).onDuplicateKeyUpdate({
      set: {
        english: words.english,
        uzbek: words.uzbek,
        description: words.description,
        example: words.example,
        createdBy: words.createdBy,
        updatedAt: words.updatedAt,
      },
    });
  }

  if (store.userProgress.length) {
    await db.insert(userProgress).values(store.userProgress).onDuplicateKeyUpdate({
      set: {
        known: userProgress.known,
        reviewCount: userProgress.reviewCount,
        lastReviewedAt: userProgress.lastReviewedAt,
        updatedAt: userProgress.updatedAt,
      },
    });
  }

  console.log("Migration complete.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
