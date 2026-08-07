CREATE TABLE IF NOT EXISTS `facility_complaints` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `name` text NOT NULL,
  `code` text,
  `reference_id` text,
  `effective_at` integer,
  `details_json` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `facility_complaints_scope_idx` ON `facility_complaints` (`organization_id`,`campus_id`,`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `facility_complaints_reference_idx` ON `facility_complaints` (`organization_id`,`reference_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `visitor_logs_scope_guard`
BEFORE INSERT ON `visitor_logs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'expected', 'checked_in', 'checked_out', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'visitor record scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `visitor_logs_scope_update_guard`
BEFORE UPDATE ON `visitor_logs`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'expected', 'checked_in', 'checked_out', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'visitor record scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `gate_passes_scope_guard`
BEFORE INSERT ON `gate_passes`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `visitor_logs` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'requested', 'approved', 'rejected', 'used', 'expired', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'gate pass scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `gate_passes_scope_update_guard`
BEFORE UPDATE ON `gate_passes`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `visitor_logs` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'requested', 'approved', 'rejected', 'used', 'expired', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'gate pass scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `security_incidents_scope_guard`
BEFORE INSERT ON `security_incidents`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'open', 'investigating', 'resolved', 'closed')
BEGIN SELECT RAISE(ABORT, 'security incident scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `security_incidents_scope_update_guard`
BEFORE UPDATE ON `security_incidents`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'open', 'investigating', 'resolved', 'closed')
BEGIN SELECT RAISE(ABORT, 'security incident scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `evacuation_roll_calls_scope_guard`
BEFORE INSERT ON `evacuation_roll_calls`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'open', 'closed')
BEGIN SELECT RAISE(ABORT, 'evacuation roll call scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `evacuation_roll_calls_scope_update_guard`
BEFORE UPDATE ON `evacuation_roll_calls`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'open', 'closed')
BEGIN SELECT RAISE(ABORT, 'evacuation roll call scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `facility_bookings_scope_guard`
BEFORE INSERT ON `facility_bookings`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'requested', 'approved', 'rejected', 'cancelled', 'completed')
BEGIN SELECT RAISE(ABORT, 'facility booking scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `facility_bookings_scope_update_guard`
BEFORE UPDATE ON `facility_bookings`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'requested', 'approved', 'rejected', 'cancelled', 'completed')
BEGIN SELECT RAISE(ABORT, 'facility booking scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `facility_maintenance_scope_guard`
BEFORE INSERT ON `facility_maintenance_tickets`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'facility maintenance scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `facility_maintenance_scope_update_guard`
BEFORE UPDATE ON `facility_maintenance_tickets`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')
BEGIN SELECT RAISE(ABORT, 'facility maintenance scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `facility_complaints_scope_guard`
BEFORE INSERT ON `facility_complaints`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'open', 'in_progress', 'resolved', 'closed', 'rejected')
BEGIN SELECT RAISE(ABORT, 'facility complaint scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `facility_complaints_scope_update_guard`
BEFORE UPDATE ON `facility_complaints`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'open', 'in_progress', 'resolved', 'closed', 'rejected')
BEGIN SELECT RAISE(ABORT, 'facility complaint scope or status is invalid'); END;
