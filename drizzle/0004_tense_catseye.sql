CREATE TABLE IF NOT EXISTS `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`createdBy` int,
	`isGlobal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `folders` ADD COLUMN IF NOT EXISTS `bookId` int;--> statement-breakpoint
ALTER TABLE `folders` ADD COLUMN IF NOT EXISTS `unitNumber` int;--> statement-breakpoint
ALTER TABLE `folders` ADD COLUMN IF NOT EXISTS `sourceGlobalFolderId` int;--> statement-breakpoint
ALTER TABLE `words` ADD COLUMN IF NOT EXISTS `description` text;
