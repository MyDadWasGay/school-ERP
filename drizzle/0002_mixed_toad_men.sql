ALTER TABLE `applications` ADD `date_of_birth` integer;--> statement-breakpoint
ALTER TABLE `applications` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `guardian_json` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `academic_year_id` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `applied_section_id` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `source_enquiry_id` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `decision_reason` text;--> statement-breakpoint
CREATE UNIQUE INDEX `applications_org_number_unique` ON `applications` (`organization_id`,`application_number`);