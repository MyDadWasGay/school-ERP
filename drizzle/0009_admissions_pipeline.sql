ALTER TABLE `admissions_enquiries` ADD COLUMN `campaign` text;
--> statement-breakpoint
ALTER TABLE `admissions_enquiries` ADD COLUMN `lost_reason` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `admission_follow_ups` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `enquiry_id` text NOT NULL,
  `assigned_to` text,
  `due_at` integer NOT NULL,
  `completed_at` integer,
  `note` text NOT NULL,
  `outcome` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admission_followups_scope_idx` ON `admission_follow_ups` (`organization_id`, `campus_id`, `status`, `due_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admission_followups_enquiry_idx` ON `admission_follow_ups` (`organization_id`, `enquiry_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `admission_assessments` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `application_id` text NOT NULL,
  `assessment_type` text NOT NULL,
  `scheduled_at` integer NOT NULL,
  `score` integer,
  `outcome` text,
  `notes` text,
  `assessed_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admission_assessments_application_idx` ON `admission_assessments` (`organization_id`, `application_id`, `status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admission_assessments_schedule_idx` ON `admission_assessments` (`organization_id`, `scheduled_at`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `admission_followups_tenant_guard`
BEFORE INSERT ON `admission_follow_ups`
WHEN NOT EXISTS (
  SELECT 1 FROM `admissions_enquiries`
  WHERE `id` = NEW.`enquiry_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`assigned_to` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`assigned_to` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'admission follow-up tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `admission_followups_update_tenant_guard`
BEFORE UPDATE ON `admission_follow_ups`
WHEN NOT EXISTS (
  SELECT 1 FROM `admissions_enquiries`
  WHERE `id` = NEW.`enquiry_id` AND `organization_id` = NEW.`organization_id`
)
  OR NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'admission follow-up tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `admission_assessments_tenant_guard`
BEFORE INSERT ON `admission_assessments`
WHEN NOT EXISTS (
  SELECT 1 FROM `applications`
  WHERE `id` = NEW.`application_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`assessed_by` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`assessed_by` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'admission assessment tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `admission_assessments_update_tenant_guard`
BEFORE UPDATE ON `admission_assessments`
WHEN NOT EXISTS (
  SELECT 1 FROM `applications`
  WHERE `id` = NEW.`application_id` AND `organization_id` = NEW.`organization_id`
)
  OR NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'admission assessment tenant is invalid'); END;
