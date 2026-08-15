ALTER TABLE `assignments` ADD `details_json` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mobile_device_registrations` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `user_id` text NOT NULL,
  `token` text NOT NULL,
  `platform` text NOT NULL,
  `app_version` text,
  `last_seen_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `mobile_devices_org_user_token_unique`
ON `mobile_device_registrations` (`organization_id`, `user_id`, `token`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mobile_devices_user_idx`
ON `mobile_device_registrations` (`organization_id`, `user_id`, `status`);
