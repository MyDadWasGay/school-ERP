CREATE TABLE `library_issue_transactions_typed` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `copy_id` text NOT NULL,
  `borrower_user_id` text,
  `borrower_type` text DEFAULT 'user' NOT NULL,
  `borrower_id` text NOT NULL,
  `issued_at` integer NOT NULL,
  `due_at` integer,
  `returned_at` integer,
  `fine_minor` integer DEFAULT 0 NOT NULL,
  `renewal_count` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'issued' NOT NULL
);
--> statement-breakpoint
INSERT INTO `library_issue_transactions_typed` (
  `id`, `organization_id`, `campus_id`, `copy_id`, `borrower_user_id`,
  `borrower_type`, `borrower_id`, `issued_at`, `due_at`, `returned_at`,
  `fine_minor`, `renewal_count`, `created_at`, `updated_at`, `created_by`,
  `updated_by`, `status`
)
SELECT
  `id`, `organization_id`, `campus_id`, `copy_id`,
  CASE WHEN `borrower_type` = 'user' THEN COALESCE(`borrower_id`, `borrower_user_id`) ELSE NULL END,
  `borrower_type`, COALESCE(`borrower_id`, `borrower_user_id`), `issued_at`, `due_at`, `returned_at`,
  `fine_minor`, `renewal_count`, `created_at`, `updated_at`, `created_by`,
  `updated_by`, `status`
FROM `library_issue_transactions`;
--> statement-breakpoint
DROP TABLE `library_issue_transactions`;
--> statement-breakpoint
ALTER TABLE `library_issue_transactions_typed` RENAME TO `library_issue_transactions`;
--> statement-breakpoint
CREATE INDEX `library_issue_borrower_idx` ON `library_issue_transactions` (`organization_id`, `borrower_type`, `borrower_id`);
--> statement-breakpoint
CREATE INDEX `library_issue_copy_idx` ON `library_issue_transactions` (`organization_id`, `copy_id`, `status`);
--> statement-breakpoint
CREATE TRIGGER `library_issue_typed_borrower_guard`
BEFORE INSERT ON `library_issue_transactions`
WHEN NOT EXISTS (SELECT 1 FROM `library_copies` WHERE id = NEW.copy_id AND organization_id = NEW.organization_id)
  OR NEW.borrower_type NOT IN ('student', 'user')
  OR NEW.borrower_id IS NULL
  OR (NEW.borrower_type = 'student' AND NEW.borrower_user_id IS NOT NULL)
  OR (NEW.borrower_type = 'student' AND NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.borrower_id AND organization_id = NEW.organization_id))
  OR (NEW.borrower_type = 'user' AND (NEW.borrower_user_id IS NULL OR NEW.borrower_user_id <> NEW.borrower_id))
  OR (NEW.borrower_type = 'user' AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.borrower_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'library issue borrower identity or tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER `library_issue_typed_borrower_update_guard`
BEFORE UPDATE ON `library_issue_transactions`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (SELECT 1 FROM `library_copies` WHERE id = NEW.copy_id AND organization_id = NEW.organization_id)
  OR NEW.borrower_type NOT IN ('student', 'user')
  OR NEW.borrower_id IS NULL
  OR (NEW.borrower_type = 'student' AND NEW.borrower_user_id IS NOT NULL)
  OR (NEW.borrower_type = 'student' AND NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.borrower_id AND organization_id = NEW.organization_id))
  OR (NEW.borrower_type = 'user' AND (NEW.borrower_user_id IS NULL OR NEW.borrower_user_id <> NEW.borrower_id))
  OR (NEW.borrower_type = 'user' AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.borrower_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'library issue borrower identity or tenant is invalid'); END;
