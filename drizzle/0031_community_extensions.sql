CREATE TABLE IF NOT EXISTS `alumni_donations` (
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
  `status` text NOT NULL DEFAULT 'draft'
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `alumni_donations_scope_idx` ON `alumni_donations` (`organization_id`, `campus_id`, `status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `alumni_donations_reference_idx` ON `alumni_donations` (`organization_id`, `reference_id`);
--> statement-breakpoint
DROP TRIGGER IF EXISTS `club_memberships_scope_guard`;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `club_memberships_scope_guard`
BEFORE INSERT ON `club_memberships`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `clubs` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = json_extract(NEW.details_json, '$.studentId') AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'club membership scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `club_memberships_scope_update_guard`
BEFORE UPDATE ON `club_memberships`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `clubs` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = json_extract(NEW.details_json, '$.studentId') AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'club membership scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sports_teams_scope_guard`
BEFORE INSERT ON `sports_teams`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'sports team scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sports_teams_scope_update_guard`
BEFORE UPDATE ON `sports_teams`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'sports team scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sports_fixtures_scope_guard`
BEFORE INSERT ON `sports_fixtures`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `sports_teams` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'planned', 'live', 'completed', 'cancelled', 'archived')
BEGIN SELECT RAISE(ABORT, 'sports fixture scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sports_fixtures_scope_update_guard`
BEFORE UPDATE ON `sports_fixtures`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `sports_teams` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'planned', 'live', 'completed', 'cancelled', 'archived')
BEGIN SELECT RAISE(ABORT, 'sports fixture scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `event_registrations_scope_guard`
BEFORE INSERT ON `event_registrations`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `alumni_events` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'registered', 'attended', 'cancelled', 'archived')
BEGIN SELECT RAISE(ABORT, 'event registration scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `event_registrations_scope_update_guard`
BEFORE UPDATE ON `event_registrations`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `alumni_events` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'registered', 'attended', 'cancelled', 'archived')
BEGIN SELECT RAISE(ABORT, 'event registration scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `alumni_donations_scope_guard`
BEFORE INSERT ON `alumni_donations`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'pledged', 'received', 'refunded', 'cancelled', 'archived')
BEGIN SELECT RAISE(ABORT, 'alumni donation scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `alumni_donations_scope_update_guard`
BEFORE UPDATE ON `alumni_donations`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'pledged', 'received', 'refunded', 'cancelled', 'archived')
BEGIN SELECT RAISE(ABORT, 'alumni donation scope or status is invalid'); END;
