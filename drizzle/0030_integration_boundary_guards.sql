CREATE UNIQUE INDEX IF NOT EXISTS `api_keys_org_code_unique` ON `api_keys` (`organization_id`, `code`) WHERE `code` IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `webhook_events_org_code_unique` ON `webhook_events` (`organization_id`, `code`) WHERE `code` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `api_keys_scope_guard`
BEFORE INSERT ON `api_keys`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('active', 'revoked')
BEGIN SELECT RAISE(ABORT, 'API key scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `api_keys_scope_update_guard`
BEFORE UPDATE ON `api_keys`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('active', 'revoked')
BEGIN SELECT RAISE(ABORT, 'API key scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `webhook_events_scope_guard`
BEFORE INSERT ON `webhook_events`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('received', 'processed', 'rejected', 'failed')
BEGIN SELECT RAISE(ABORT, 'Webhook event scope or status is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `webhook_events_scope_update_guard`
BEFORE UPDATE ON `webhook_events`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR NEW.status NOT IN ('received', 'processed', 'rejected', 'failed')
BEGIN SELECT RAISE(ABORT, 'Webhook event scope or status is invalid'); END;
