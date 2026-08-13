ALTER TABLE `student_guardian_links` ADD COLUMN `custom_relationship` text;
--> statement-breakpoint
ALTER TABLE `student_guardian_links` ADD COLUMN `is_emergency_contact` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `student_guardian_links` ADD COLUMN `is_billing_contact` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `student_guardian_link_unique` ON `student_guardian_links` (`organization_id`,`student_id`,`guardian_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `students_name_search_idx` ON `students` (`organization_id`,`first_name`,`last_name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `guardians_contact_search_idx` ON `guardians` (`organization_id`,`email`,`phone`);
