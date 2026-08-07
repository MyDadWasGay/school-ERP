CREATE TRIGGER IF NOT EXISTS `stock_movements_tenant_guard`
BEFORE INSERT ON `stock_movements`
WHEN NOT EXISTS (SELECT 1 FROM `inventory_items` WHERE id = NEW.inventory_item_id AND organization_id = NEW.organization_id)
  OR NEW.direction NOT IN ('in', 'out')
BEGIN SELECT RAISE(ABORT, 'stock movement tenant or direction is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `stock_movements_update_tenant_guard`
BEFORE UPDATE ON `stock_movements`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.inventory_item_id <> OLD.inventory_item_id
  OR NOT EXISTS (SELECT 1 FROM `inventory_items` WHERE id = NEW.inventory_item_id AND organization_id = NEW.organization_id)
  OR NEW.direction NOT IN ('in', 'out')
BEGIN SELECT RAISE(ABORT, 'stock movement tenant or direction is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `inventory_items_update_quantity_guard`
BEFORE UPDATE OF quantity ON `inventory_items`
WHEN NEW.quantity < 0
BEGIN SELECT RAISE(ABORT, 'inventory quantity cannot be negative'); END;
