CREATE TABLE `job_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`job_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 5 NOT NULL,
	`run_after` integer NOT NULL,
	`locked_at` integer,
	`locked_by` text,
	`last_error` text,
	`idempotency_key` text,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `job_runs_due_idx` ON `job_runs` (`status`,`run_after`);
--> statement-breakpoint
CREATE INDEX `job_runs_tenant_status_idx` ON `job_runs` (`organization_id`,`status`,`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_runs_tenant_idempotency_idx` ON `job_runs` (`organization_id`,`idempotency_key`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `job_runs_tenant_guard`
BEFORE INSERT ON `job_runs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'job tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `job_runs_update_tenant_guard`
BEFORE UPDATE ON `job_runs`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'job tenant is invalid'); END;
