CREATE TABLE `donations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`donor_name` text NOT NULL,
	`donor_email` text,
	`amount_minor` integer NOT NULL,
	`purpose` text NOT NULL,
	`payment_reference` text,
	`received_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'received' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `donations_scope_idx` ON `donations` (`organization_id`,`campus_id`,`received_at`);
