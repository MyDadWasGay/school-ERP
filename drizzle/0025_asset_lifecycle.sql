ALTER TABLE `asset_assignments` ADD COLUMN `assignee_type` text;
--> statement-breakpoint
ALTER TABLE `asset_assignments` ADD COLUMN `assignee_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `asset_assignments_active_asset_unique` ON `asset_assignments` (`organization_id`,`reference_id`) WHERE `status` = 'active';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `asset_depreciation_period_unique` ON `asset_depreciation_entries` (`organization_id`,`reference_id`,`code`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `assets_status_guard`
BEFORE INSERT ON `assets`
WHEN NEW.status NOT IN ('draft', 'active', 'retired', 'disposed')
BEGIN SELECT RAISE(ABORT, 'asset status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `assets_status_update_guard`
BEFORE UPDATE ON `assets`
WHEN NEW.status NOT IN ('draft', 'active', 'retired', 'disposed')
BEGIN SELECT RAISE(ABORT, 'asset status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `asset_assignments_scope_guard`
BEFORE INSERT ON `asset_assignments`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `assets`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND status = 'active'
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
  OR NEW.status NOT IN ('draft', 'active', 'returned', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'asset assignment scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `asset_assignments_scope_update_guard`
BEFORE UPDATE ON `asset_assignments`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `assets`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
  OR NEW.status NOT IN ('draft', 'active', 'returned', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'asset assignment scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `asset_maintenance_scope_guard`
BEFORE INSERT ON `asset_maintenance_tickets`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `assets`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND status <> 'disposed'
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
  OR NEW.status NOT IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'asset maintenance scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `asset_maintenance_scope_update_guard`
BEFORE UPDATE ON `asset_maintenance_tickets`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `assets`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
  OR NEW.status NOT IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'asset maintenance scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `asset_depreciation_scope_guard`
BEFORE INSERT ON `asset_depreciation_entries`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NEW.code IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `assets`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND status <> 'disposed'
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
  OR NEW.status NOT IN ('draft', 'posted', 'reversed')
BEGIN SELECT RAISE(ABORT, 'asset depreciation scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `asset_depreciation_scope_update_guard`
BEFORE UPDATE ON `asset_depreciation_entries`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NEW.code IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `assets`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
  OR NEW.status NOT IN ('draft', 'posted', 'reversed')
BEGIN SELECT RAISE(ABORT, 'asset depreciation scope or status is invalid'); END;
