import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordSalt: varchar("passwordSalt", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Folders table for organizing words
 * Admin-created folders (createdBy = null) are visible to all users
 * User-created folders are only visible to the creator
 */
export const folders = mysqlTable("folders", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: int("createdBy"), // null means admin-created (global)
  isGlobal: boolean("isGlobal").default(false).notNull(), // true for admin folders
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

/**
 * Words table for vocabulary items
 * Admin-created words (createdBy = null) are visible to all users
 * User-created words are only visible to the creator
 */
export const words = mysqlTable("words", {
  id: int("id").autoincrement().primaryKey(),
  folderId: int("folderId").notNull(),
  english: varchar("english", { length: 255 }).notNull(),
  uzbek: varchar("uzbek", { length: 255 }).notNull(),
  example: text("example"),
  createdBy: int("createdBy"), // null means admin-created (global)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Word = typeof words.$inferSelect;
export type InsertWord = typeof words.$inferInsert;

/**
 * User progress table for tracking which words a user knows
 */
export const userProgress = mysqlTable("userProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  wordId: int("wordId").notNull(),
  known: boolean("known").default(false).notNull(),
  reviewCount: int("reviewCount").default(0).notNull(),
  lastReviewedAt: timestamp("lastReviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  folders: many(folders),
  words: many(words),
  progress: many(userProgress),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  creator: one(users, {
    fields: [folders.createdBy],
    references: [users.id],
  }),
  words: many(words),
}));

export const wordsRelations = relations(words, ({ one, many }) => ({
  folder: one(folders, {
    fields: [words.folderId],
    references: [folders.id],
  }),
  creator: one(users, {
    fields: [words.createdBy],
    references: [users.id],
  }),
  progress: many(userProgress),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  word: one(words, {
    fields: [userProgress.wordId],
    references: [words.id],
  }),
}));
