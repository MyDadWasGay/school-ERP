CREATE UNIQUE INDEX IF NOT EXISTS `route_allocations_active_student_unique`
ON `route_allocations` (`organization_id`, `student_id`)
WHERE `status` = 'active';
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `route_allocations_capacity_guard`
BEFORE INSERT ON `route_allocations`
WHEN NEW.status = 'active'
  AND (
    SELECT COUNT(*)
    FROM `route_allocations`
    WHERE organization_id = NEW.organization_id
      AND route_id = NEW.route_id
      AND status = 'active'
  ) >= (
    SELECT capacity
    FROM `transport_routes`
    WHERE id = NEW.route_id
      AND organization_id = NEW.organization_id
      AND status = 'active'
  )
BEGIN SELECT RAISE(ABORT, 'transport route capacity has been reached'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `route_allocations_update_capacity_guard`
BEFORE UPDATE ON `route_allocations`
WHEN NEW.status = 'active'
  AND (
    SELECT COUNT(*)
    FROM `route_allocations`
    WHERE organization_id = NEW.organization_id
      AND route_id = NEW.route_id
      AND status = 'active'
      AND id <> OLD.id
  ) >= (
    SELECT capacity
    FROM `transport_routes`
    WHERE id = NEW.route_id
      AND organization_id = NEW.organization_id
      AND status = 'active'
  )
BEGIN SELECT RAISE(ABORT, 'transport route capacity has been reached'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `facility_bookings_approved_overlap_insert_guard`
BEFORE INSERT ON `facility_bookings`
WHEN NEW.status = 'approved'
  AND (
    NEW.details_json IS NULL
    OR json_valid(NEW.details_json) = 0
    OR julianday(json_extract(NEW.details_json, '$.startsAt')) IS NULL
    OR julianday(json_extract(NEW.details_json, '$.endsAt')) IS NULL
    OR julianday(json_extract(NEW.details_json, '$.endsAt')) <= julianday(json_extract(NEW.details_json, '$.startsAt'))
    OR EXISTS (
      SELECT 1
      FROM `facility_bookings` existing
      WHERE existing.organization_id = NEW.organization_id
        AND (existing.campus_id = NEW.campus_id OR (existing.campus_id IS NULL AND NEW.campus_id IS NULL))
        AND lower(existing.name) = lower(NEW.name)
        AND existing.status = 'approved'
        AND json_valid(existing.details_json) = 1
        AND julianday(json_extract(existing.details_json, '$.startsAt')) < julianday(json_extract(NEW.details_json, '$.endsAt'))
        AND julianday(json_extract(existing.details_json, '$.endsAt')) > julianday(json_extract(NEW.details_json, '$.startsAt'))
    )
  )
BEGIN SELECT RAISE(ABORT, 'facility booking approval overlaps an approved booking'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `facility_bookings_approved_overlap_update_guard`
BEFORE UPDATE ON `facility_bookings`
WHEN NEW.status = 'approved'
  AND (
    NEW.details_json IS NULL
    OR json_valid(NEW.details_json) = 0
    OR julianday(json_extract(NEW.details_json, '$.startsAt')) IS NULL
    OR julianday(json_extract(NEW.details_json, '$.endsAt')) IS NULL
    OR julianday(json_extract(NEW.details_json, '$.endsAt')) <= julianday(json_extract(NEW.details_json, '$.startsAt'))
    OR EXISTS (
      SELECT 1
      FROM `facility_bookings` existing
      WHERE existing.id <> OLD.id
        AND existing.organization_id = NEW.organization_id
        AND (existing.campus_id = NEW.campus_id OR (existing.campus_id IS NULL AND NEW.campus_id IS NULL))
        AND lower(existing.name) = lower(NEW.name)
        AND existing.status = 'approved'
        AND json_valid(existing.details_json) = 1
        AND julianday(json_extract(existing.details_json, '$.startsAt')) < julianday(json_extract(NEW.details_json, '$.endsAt'))
        AND julianday(json_extract(existing.details_json, '$.endsAt')) > julianday(json_extract(NEW.details_json, '$.startsAt'))
    )
  )
BEGIN SELECT RAISE(ABORT, 'facility booking approval overlaps an approved booking'); END;
