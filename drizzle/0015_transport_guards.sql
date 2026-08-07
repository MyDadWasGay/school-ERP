CREATE INDEX `route_allocations_route_idx` ON `route_allocations` (`organization_id`,`route_id`,`status`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `route_allocations_tenant_guard`
BEFORE INSERT ON `route_allocations`
WHEN NOT EXISTS (SELECT 1 FROM `transport_routes` WHERE id = NEW.route_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `transport_stops` WHERE id = NEW.stop_id AND organization_id = NEW.organization_id)
  OR (NEW.status = 'active' AND EXISTS (SELECT 1 FROM `route_allocations` WHERE organization_id = NEW.organization_id AND student_id = NEW.student_id AND status = 'active'))
BEGIN SELECT RAISE(ABORT, 'transport allocation tenant or duplicate student is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `route_allocations_update_tenant_guard`
BEFORE UPDATE ON `route_allocations`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.route_id <> OLD.route_id
  OR NEW.student_id <> OLD.student_id
  OR NOT EXISTS (SELECT 1 FROM `transport_routes` WHERE id = NEW.route_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `transport_stops` WHERE id = NEW.stop_id AND organization_id = NEW.organization_id)
  OR (NEW.status = 'active' AND EXISTS (SELECT 1 FROM `route_allocations` WHERE organization_id = NEW.organization_id AND student_id = NEW.student_id AND status = 'active' AND id <> OLD.id))
BEGIN SELECT RAISE(ABORT, 'transport allocation tenant or duplicate student is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `transport_routes_vehicle_guard`
BEFORE INSERT ON `transport_routes`
WHEN NEW.vehicle_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `vehicles` WHERE id = NEW.vehicle_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'transport route vehicle tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `transport_routes_update_vehicle_guard`
BEFORE UPDATE ON `transport_routes`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.vehicle_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `vehicles` WHERE id = NEW.vehicle_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'transport route vehicle tenant is invalid'); END;
