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
DROP PROCEDURE IF EXISTS add_source_global_folder_id_if_missing;
--> statement-breakpoint
CREATE PROCEDURE add_source_global_folder_id_if_missing()
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = DATABASE()
			AND table_name = 'folders'
			AND column_name = 'sourceGlobalFolderId'
	) THEN
		ALTER TABLE `folders` ADD COLUMN `sourceGlobalFolderId` int;
	END IF;
END;
--> statement-breakpoint
CALL add_source_global_folder_id_if_missing();
--> statement-breakpoint
DROP PROCEDURE IF EXISTS add_source_global_folder_id_if_missing;
