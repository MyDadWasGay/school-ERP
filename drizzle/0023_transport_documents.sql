CREATE TRIGGER IF NOT EXISTS `vehicle_documents_scope_guard`
BEFORE INSERT ON `vehicle_documents`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `vehicles`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
BEGIN SELECT RAISE(ABORT, 'vehicle document scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `vehicle_documents_scope_update_guard`
BEFORE UPDATE ON `vehicle_documents`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `vehicles`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
BEGIN SELECT RAISE(ABORT, 'vehicle document scope is invalid'); END;
