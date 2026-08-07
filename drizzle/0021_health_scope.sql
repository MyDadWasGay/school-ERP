CREATE UNIQUE INDEX `health_profile_active_student_unique` ON `health_profiles` (`organization_id`,`student_id`) WHERE `status` = 'active';
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `health_profiles_student_scope_guard`
BEFORE INSERT ON `health_profiles`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
BEGIN SELECT RAISE(ABORT, 'health profile student scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `health_profiles_student_scope_update_guard`
BEFORE UPDATE ON `health_profiles`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
BEGIN SELECT RAISE(ABORT, 'health profile student scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `clinic_visits_student_scope_guard`
BEFORE INSERT ON `clinic_visits`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
BEGIN SELECT RAISE(ABORT, 'clinic visit student scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `clinic_visits_student_scope_update_guard`
BEFORE UPDATE ON `clinic_visits`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
BEGIN SELECT RAISE(ABORT, 'clinic visit student scope is invalid'); END;
