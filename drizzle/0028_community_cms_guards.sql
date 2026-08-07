CREATE UNIQUE INDEX IF NOT EXISTS `clubs_org_campus_name_unique` ON `clubs` (`organization_id`,`campus_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `cms_pages_org_slug_unique` ON `cms_pages` (`organization_id`,`slug`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `clubs_scope_guard`
BEFORE INSERT ON `clubs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR (NEW.coordinator_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.coordinator_user_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'club scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `clubs_scope_update_guard`
BEFORE UPDATE ON `clubs`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR (NEW.coordinator_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.coordinator_user_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'club scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_achievements_scope_guard`
BEFORE INSERT ON `student_achievements`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.student_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'achievement scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_achievements_scope_update_guard`
BEFORE UPDATE ON `student_achievements`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.student_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'achievement scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `alumni_profiles_scope_guard`
BEFORE INSERT ON `alumni_profiles`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR (NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'alumni profile scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `alumni_profiles_scope_update_guard`
BEFORE UPDATE ON `alumni_profiles`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR (NEW.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))))
  OR NEW.status NOT IN ('draft', 'active', 'archived')
BEGIN SELECT RAISE(ABORT, 'alumni profile scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `cms_pages_scope_guard`
BEFORE INSERT ON `cms_pages`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'published', 'archived')
BEGIN SELECT RAISE(ABORT, 'CMS page scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `cms_pages_scope_update_guard`
BEFORE UPDATE ON `cms_pages`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'published', 'archived')
BEGIN SELECT RAISE(ABORT, 'CMS page scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `cms_media_scope_guard`
BEFORE INSERT ON `cms_media`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'published', 'archived')
BEGIN SELECT RAISE(ABORT, 'CMS media scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `cms_media_scope_update_guard`
BEFORE UPDATE ON `cms_media`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'published', 'archived')
BEGIN SELECT RAISE(ABORT, 'CMS media scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `forms_scope_guard`
BEFORE INSERT ON `forms`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'published', 'archived')
BEGIN SELECT RAISE(ABORT, 'form scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `forms_scope_update_guard`
BEFORE UPDATE ON `forms`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'published', 'archived')
BEGIN SELECT RAISE(ABORT, 'form scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `form_submissions_scope_guard`
BEFORE INSERT ON `form_submissions`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.form_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `forms` WHERE id = NEW.form_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)) AND status = 'published')
  OR NEW.status NOT IN ('received', 'reviewed', 'archived')
BEGIN SELECT RAISE(ABORT, 'form submission scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `form_submissions_scope_update_guard`
BEFORE UPDATE ON `form_submissions`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.form_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `forms` WHERE id = NEW.form_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR NEW.status NOT IN ('received', 'reviewed', 'archived')
BEGIN SELECT RAISE(ABORT, 'form submission scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `alumni_events_scope_guard`
BEFORE INSERT ON `alumni_events`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'planned', 'published', 'completed', 'cancelled', 'archived')
BEGIN SELECT RAISE(ABORT, 'alumni event scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `mentorships_scope_guard`
BEFORE INSERT ON `mentorships`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'requested', 'accepted', 'declined', 'completed', 'cancelled', 'archived')
BEGIN SELECT RAISE(ABORT, 'mentorship scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `job_board_posts_scope_guard`
BEFORE INSERT ON `job_board_posts`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('draft', 'published', 'closed', 'archived')
BEGIN SELECT RAISE(ABORT, 'job post scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `club_memberships_scope_guard`
BEFORE INSERT ON `club_memberships`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM `clubs` WHERE id = NEW.reference_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
BEGIN SELECT RAISE(ABORT, 'club membership scope is invalid'); END;
