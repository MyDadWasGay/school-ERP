ALTER TABLE `library_issue_transactions` ADD COLUMN `borrower_type` text NOT NULL DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE `library_issue_transactions` ADD COLUMN `borrower_id` text;
--> statement-breakpoint
ALTER TABLE `library_issue_transactions` ADD COLUMN `due_at` integer;
--> statement-breakpoint
ALTER TABLE `library_issue_transactions` ADD COLUMN `fine_minor` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `library_issue_transactions` ADD COLUMN `renewal_count` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX `library_issue_borrower_idx_v2` ON `library_issue_transactions` (`organization_id`,`borrower_type`,`borrower_id`);
--> statement-breakpoint
CREATE INDEX `library_issue_copy_idx` ON `library_issue_transactions` (`organization_id`,`copy_id`,`status`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `library_copies_tenant_guard`
BEFORE INSERT ON `library_copies`
WHEN NOT EXISTS (SELECT 1 FROM `library_items` WHERE id = NEW.item_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'library copy tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `library_copies_update_tenant_guard`
BEFORE UPDATE ON `library_copies`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (SELECT 1 FROM `library_items` WHERE id = NEW.item_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'library copy tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `library_issue_tenant_guard`
BEFORE INSERT ON `library_issue_transactions`
WHEN NOT EXISTS (SELECT 1 FROM `library_copies` WHERE id = NEW.copy_id AND organization_id = NEW.organization_id)
  OR NEW.borrower_type NOT IN ('student', 'user')
  OR (NEW.borrower_type = 'student' AND NOT EXISTS (SELECT 1 FROM `students` WHERE id = COALESCE(NEW.borrower_id, NEW.borrower_user_id) AND organization_id = NEW.organization_id))
  OR (NEW.borrower_type = 'user' AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = COALESCE(NEW.borrower_id, NEW.borrower_user_id) AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'library issue tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `library_issue_update_tenant_guard`
BEFORE UPDATE ON `library_issue_transactions`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (SELECT 1 FROM `library_copies` WHERE id = NEW.copy_id AND organization_id = NEW.organization_id)
  OR NEW.borrower_type NOT IN ('student', 'user')
  OR (NEW.borrower_type = 'student' AND NOT EXISTS (SELECT 1 FROM `students` WHERE id = COALESCE(NEW.borrower_id, NEW.borrower_user_id) AND organization_id = NEW.organization_id))
  OR (NEW.borrower_type = 'user' AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = COALESCE(NEW.borrower_id, NEW.borrower_user_id) AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'library issue tenant is invalid'); END;
