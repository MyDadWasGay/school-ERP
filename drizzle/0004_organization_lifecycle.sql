CREATE TRIGGER `organizations_status_insert_guard`
BEFORE INSERT ON `organizations`
FOR EACH ROW
WHEN NEW.`status` NOT IN ('provisioning', 'active', 'suspended', 'archived', 'deletion_scheduled')
BEGIN
  SELECT RAISE(ABORT, 'invalid organization status');
END;
--> statement-breakpoint
CREATE TRIGGER `organizations_status_transition_guard`
BEFORE UPDATE OF `status` ON `organizations`
FOR EACH ROW
WHEN NOT (
  NEW.`status` IN ('provisioning', 'active', 'suspended', 'archived', 'deletion_scheduled')
  AND (
    NEW.`status` = OLD.`status`
    OR (OLD.`status` = 'provisioning' AND NEW.`status` = 'active')
    OR (OLD.`status` = 'active' AND NEW.`status` IN ('suspended', 'archived'))
    OR (OLD.`status` = 'suspended' AND NEW.`status` IN ('active', 'archived'))
    OR (OLD.`status` = 'archived' AND NEW.`status` IN ('active', 'deletion_scheduled'))
    OR (OLD.`status` = 'deletion_scheduled' AND NEW.`status` = 'archived')
  )
)
BEGIN
  SELECT RAISE(ABORT, 'invalid organization status transition');
END;
