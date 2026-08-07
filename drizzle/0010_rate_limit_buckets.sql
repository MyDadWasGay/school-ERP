CREATE TABLE IF NOT EXISTS `rate_limit_buckets` (
  `id` text PRIMARY KEY NOT NULL,
  `key_hash` text NOT NULL,
  `window_start` integer NOT NULL,
  `request_count` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `rate_limit_key_unique` ON `rate_limit_buckets` (`key_hash`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rate_limit_window_idx` ON `rate_limit_buckets` (`window_start`);
