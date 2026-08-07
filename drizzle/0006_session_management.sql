CREATE TABLE IF NOT EXISTS `platform_session_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `platform_admin_id` text NOT NULL,
  `firebase_session_id` text NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `expires_at` integer NOT NULL,
  `revoked_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `platform_session_fingerprint_unique` ON `platform_session_logs` (`firebase_session_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `platform_session_admin_idx` ON `platform_session_logs` (`platform_admin_id`, `status`);
