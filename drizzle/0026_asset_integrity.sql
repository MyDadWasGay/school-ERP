CREATE UNIQUE INDEX IF NOT EXISTS `assets_organization_code_unique` ON `assets` (`organization_id`,`code`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `asset_assignments_assignee_guard`
BEFORE INSERT ON `asset_assignments`
WHEN NEW.assignee_type NOT IN ('student', 'employee')
  OR NEW.assignee_id IS NULL
  OR (NEW.assignee_type = 'student' AND NOT EXISTS (
    SELECT 1 FROM `students`
    WHERE id = NEW.assignee_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  ))
  OR (NEW.assignee_type = 'employee' AND NOT EXISTS (
    SELECT 1 FROM `employees`
    WHERE id = NEW.assignee_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  ))
BEGIN SELECT RAISE(ABORT, 'asset assignment assignee scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `asset_assignments_assignee_update_guard`
BEFORE UPDATE ON `asset_assignments`
WHEN NEW.assignee_type NOT IN ('student', 'employee')
  OR NEW.assignee_id IS NULL
  OR (NEW.assignee_type = 'student' AND NOT EXISTS (
    SELECT 1 FROM `students`
    WHERE id = NEW.assignee_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  ))
  OR (NEW.assignee_type = 'employee' AND NOT EXISTS (
    SELECT 1 FROM `employees`
    WHERE id = NEW.assignee_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  ))
BEGIN SELECT RAISE(ABORT, 'asset assignment assignee scope is invalid'); END;
