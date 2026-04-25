CREATE INDEX `folders_isGlobal_idx` ON `folders` (`isGlobal`);
--> statement-breakpoint
CREATE INDEX `folders_isGlobal_bookId_unitNumber_idx` ON `folders` (`isGlobal`, `bookId`, `unitNumber`);
--> statement-breakpoint
CREATE INDEX `folders_createdBy_sourceGlobalFolderId_idx` ON `folders` (`createdBy`, `sourceGlobalFolderId`);
--> statement-breakpoint
CREATE INDEX `words_folderId_idx` ON `words` (`folderId`);
--> statement-breakpoint
CREATE INDEX `userProgress_userId_wordId_idx` ON `userProgress` (`userId`, `wordId`);
--> statement-breakpoint
CREATE INDEX `books_isGlobal_idx` ON `books` (`isGlobal`);
