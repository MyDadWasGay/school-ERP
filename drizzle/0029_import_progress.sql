ALTER TABLE `import_jobs` ADD COLUMN `processed_rows` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `import_jobs_org_entity_idx` ON `import_jobs` (`organization_id`, `entity_type`, `created_at`);
