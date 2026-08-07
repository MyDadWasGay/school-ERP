CREATE TRIGGER IF NOT EXISTS `purchase_requisitions_status_guard`
BEFORE INSERT ON `purchase_requisitions`
WHEN NEW.status NOT IN ('draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'purchase requisition status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `purchase_requisitions_status_update_guard`
BEFORE UPDATE ON `purchase_requisitions`
WHEN NEW.status NOT IN ('draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'purchase requisition status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `purchase_orders_status_guard`
BEFORE INSERT ON `purchase_orders`
WHEN NEW.status NOT IN ('draft', 'submitted', 'approved', 'ordered', 'partially_received', 'received', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'purchase order status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `purchase_orders_status_update_guard`
BEFORE UPDATE ON `purchase_orders`
WHEN NEW.status NOT IN ('draft', 'submitted', 'approved', 'ordered', 'partially_received', 'received', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'purchase order status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `goods_receipts_status_guard`
BEFORE INSERT ON `goods_receipts`
WHEN NEW.status NOT IN ('draft', 'posted', 'rejected')
BEGIN SELECT RAISE(ABORT, 'goods receipt status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `goods_receipts_status_update_guard`
BEFORE UPDATE ON `goods_receipts`
WHEN NEW.status NOT IN ('draft', 'posted', 'rejected')
BEGIN SELECT RAISE(ABORT, 'goods receipt status is invalid'); END;
