CREATE UNIQUE INDEX `library_reservation_active_unique` ON `library_reservations` (`organization_id`,`reference_id`,`created_by`) WHERE `status` = 'pending' AND `reference_id` IS NOT NULL AND `created_by` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `library_reservations_scope_guard`
BEFORE INSERT ON `library_reservations`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `library_items`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
BEGIN SELECT RAISE(ABORT, 'library reservation scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `library_reservations_scope_update_guard`
BEFORE UPDATE ON `library_reservations`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `library_items`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
BEGIN SELECT RAISE(ABORT, 'library reservation scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `digital_resources_scope_guard`
BEFORE INSERT ON `digital_resources`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'digital resource scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `digital_resources_scope_update_guard`
BEFORE UPDATE ON `digital_resources`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'digital resource scope is invalid'); END;
