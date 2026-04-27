ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
UPDATE `users`
SET `username` = `openId`
WHERE `username` IS NULL
  AND `passwordHash` IS NOT NULL
  AND `openId` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);
