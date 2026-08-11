ALTER TABLE `employees` ADD COLUMN `allowance_minor` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `employees` ADD COLUMN `fixed_deduction_minor` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `employees` ADD COLUMN `deduction_rate_bps` integer DEFAULT 0 NOT NULL;
