ALTER TABLE `guardians` ADD `phone_normalized` text;
--> statement-breakpoint
UPDATE `guardians`
SET `email_normalized` = lower(trim(`email`)),
    `phone_normalized` = replace(replace(replace(replace(replace(replace(replace(trim(`phone`), ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', ''), '/', '')
WHERE `email` IS NOT NULL OR `phone` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `guardians_email_normalized_idx` ON `guardians` (`organization_id`, `email_normalized`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `guardians_phone_normalized_idx` ON `guardians` (`organization_id`, `phone_normalized`);
--> statement-breakpoint
ALTER TABLE `import_jobs` ADD `idempotency_key` text;
--> statement-breakpoint
ALTER TABLE `import_jobs` ADD `request_hash` text;
--> statement-breakpoint
DROP INDEX IF EXISTS `import_jobs_org_idempotency_idx`;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `import_jobs_org_entity_idempotency_idx` ON `import_jobs` (`organization_id`, `entity_type`, `idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `applications_org_source_enquiry_unique`
ON `applications` (`organization_id`, `source_enquiry_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `enrollments_capacity_guard_insert`
BEFORE INSERT ON `enrollments`
WHEN NEW.status = 'active'
BEGIN
  SELECT RAISE(ABORT, 'SECTION_CAPACITY_REACHED')
  WHERE (SELECT COUNT(*) FROM `enrollments` e
    WHERE e.organization_id = NEW.organization_id
      AND e.academic_year_id = NEW.academic_year_id
      AND e.section_id = NEW.section_id
      AND e.status = 'active') >= COALESCE((SELECT capacity FROM `sections` s
    WHERE s.organization_id = NEW.organization_id AND s.id = NEW.section_id), 0);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `enrollments_capacity_guard_update`
BEFORE UPDATE OF `academic_year_id`, `section_id`, `status` ON `enrollments`
WHEN NEW.status = 'active' AND (
  NEW.academic_year_id <> OLD.academic_year_id OR
  NEW.section_id <> OLD.section_id OR
  OLD.status <> 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'SECTION_CAPACITY_REACHED')
  WHERE (SELECT COUNT(*) FROM `enrollments` e
    WHERE e.organization_id = NEW.organization_id
      AND e.academic_year_id = NEW.academic_year_id
      AND e.section_id = NEW.section_id
      AND e.status = 'active'
      AND e.id <> OLD.id) >= COALESCE((SELECT capacity FROM `sections` s
    WHERE s.organization_id = NEW.organization_id AND s.id = NEW.section_id), 0);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `enrollments_roll_guard_insert`
BEFORE INSERT ON `enrollments`
WHEN NEW.status = 'active' AND NEW.roll_number IS NOT NULL AND trim(NEW.roll_number) <> ''
BEGIN
  SELECT RAISE(ABORT, 'ROLL_NUMBER_IN_USE')
  WHERE EXISTS (SELECT 1 FROM `enrollments` e
    WHERE e.organization_id = NEW.organization_id
      AND e.academic_year_id = NEW.academic_year_id
      AND e.class_id = NEW.class_id
      AND e.section_id = NEW.section_id
      AND e.roll_number = NEW.roll_number
      AND e.status = 'active');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `enrollments_roll_guard_update`
BEFORE UPDATE OF `academic_year_id`, `class_id`, `section_id`, `roll_number`, `status` ON `enrollments`
WHEN NEW.status = 'active' AND NEW.roll_number IS NOT NULL AND trim(NEW.roll_number) <> ''
BEGIN
  SELECT RAISE(ABORT, 'ROLL_NUMBER_IN_USE')
  WHERE EXISTS (SELECT 1 FROM `enrollments` e
    WHERE e.organization_id = NEW.organization_id
      AND e.academic_year_id = NEW.academic_year_id
      AND e.class_id = NEW.class_id
      AND e.section_id = NEW.section_id
      AND e.roll_number = NEW.roll_number
      AND e.status = 'active'
      AND e.id <> OLD.id);
END;
