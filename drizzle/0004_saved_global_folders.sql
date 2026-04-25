ALTER TABLE `folders`
ADD COLUMN IF NOT EXISTS `sourceGlobalFolderId` int;
