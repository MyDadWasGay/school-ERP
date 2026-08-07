CREATE TRIGGER IF NOT EXISTS `mess_menus_scope_guard`
BEFORE INSERT ON `mess_menus`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'mess menu scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `mess_menus_scope_update_guard`
BEFORE UPDATE ON `mess_menus`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'mess menu scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `canteen_transactions_scope_guard`
BEFORE INSERT ON `canteen_transactions`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `mess_menus`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
BEGIN SELECT RAISE(ABORT, 'canteen transaction scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `canteen_transactions_scope_update_guard`
BEFORE UPDATE ON `canteen_transactions`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `mess_menus`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
BEGIN SELECT RAISE(ABORT, 'canteen transaction scope is invalid'); END;
