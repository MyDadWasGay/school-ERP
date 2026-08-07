ALTER TABLE `messages` ADD COLUMN `published_at` integer;
--> statement-breakpoint
ALTER TABLE `notification_events` ADD COLUMN `message_id` text;
--> statement-breakpoint
ALTER TABLE `notification_events` ADD COLUMN `read_at` integer;
--> statement-breakpoint
CREATE INDEX `notifications_message_idx` ON `notification_events` (`organization_id`,`message_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_message_recipient_unique` ON `notification_events` (`organization_id`,`message_id`,`recipient_user_id`,`channel`) WHERE `message_id` IS NOT NULL AND `recipient_user_id` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `messages_scope_guard`
BEFORE INSERT ON `messages`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'message scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `messages_scope_update_guard`
BEFORE UPDATE ON `messages`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'message scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `notification_events_delivery_guard`
BEFORE INSERT ON `notification_events`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.message_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `messages` WHERE id = NEW.message_id AND organization_id = NEW.organization_id))
  OR (NEW.recipient_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.recipient_user_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'notification delivery scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `notification_events_delivery_update_guard`
BEFORE UPDATE ON `notification_events`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.message_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `messages` WHERE id = NEW.message_id AND organization_id = NEW.organization_id))
  OR (NEW.recipient_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.recipient_user_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'notification delivery scope is invalid'); END;
