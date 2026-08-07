CREATE TABLE IF NOT EXISTS `invitation_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `user_id` text NOT NULL,
  `token_hash` text NOT NULL,
  `expires_at` integer NOT NULL,
  `accepted_at` integer,
  `revoked_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `invitation_token_hash_unique` ON `invitation_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invitation_user_status_idx` ON `invitation_tokens` (`organization_id`, `user_id`, `status`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `invitation_tokens_tenant_guard`
BEFORE INSERT ON `invitation_tokens`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'invitation tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `invitation_tokens_update_tenant_guard`
BEFORE UPDATE ON `invitation_tokens`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'invitation tenant is invalid'); END;
