-- Guard tenant-owned tables introduced or hardened after the core integrity
-- migration. These checks make a valid organization relationship a database
-- invariant; service-layer scope checks still protect campus and permissions.
CREATE TRIGGER IF NOT EXISTS `attendance_corrections_tenant_guard`
BEFORE INSERT ON `attendance_correction_requests`
WHEN NOT EXISTS (SELECT 1 FROM `student_attendance_records` WHERE id = NEW.attendance_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'attendance correction tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `attendance_corrections_update_tenant_guard`
BEFORE UPDATE ON `attendance_correction_requests`
WHEN NOT EXISTS (SELECT 1 FROM `student_attendance_records` WHERE id = NEW.attendance_id AND organization_id = NEW.organization_id)
  OR NEW.organization_id <> OLD.organization_id
BEGIN SELECT RAISE(ABORT, 'attendance correction tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `discipline_incidents_tenant_guard`
BEFORE INSERT ON `discipline_incidents`
WHEN NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'discipline incident tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `discipline_incidents_update_tenant_guard`
BEFORE UPDATE ON `discipline_incidents`
WHEN NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id)
  OR NEW.organization_id <> OLD.organization_id
BEGIN SELECT RAISE(ABORT, 'discipline incident tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `leave_requests_tenant_guard`
BEFORE INSERT ON `leave_requests`
WHEN NEW.requester_type NOT IN ('employee', 'student')
  OR (NEW.requester_type = 'employee' AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.requester_id AND organization_id = NEW.organization_id))
  OR (NEW.requester_type = 'student' AND NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.requester_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'leave request tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `leave_requests_update_tenant_guard`
BEFORE UPDATE ON `leave_requests`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.requester_type NOT IN ('employee', 'student')
  OR (NEW.requester_type = 'employee' AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.requester_id AND organization_id = NEW.organization_id))
  OR (NEW.requester_type = 'student' AND NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.requester_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'leave request tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `exam_schedules_tenant_guard`
BEFORE INSERT ON `exam_schedules`
WHEN NOT EXISTS (SELECT 1 FROM `exams` WHERE id = NEW.exam_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `subjects` WHERE id = NEW.subject_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `classes` WHERE id = NEW.class_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'exam schedule tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `exam_schedules_update_tenant_guard`
BEFORE UPDATE ON `exam_schedules`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (SELECT 1 FROM `exams` WHERE id = NEW.exam_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `subjects` WHERE id = NEW.subject_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `classes` WHERE id = NEW.class_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'exam schedule tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `integration_configs_tenant_guard`
BEFORE INSERT ON `integration_configs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'integration config tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `integration_configs_update_tenant_guard`
BEFORE UPDATE ON `integration_configs`
WHEN NEW.organization_id <> OLD.organization_id OR NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'integration config tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `import_jobs_tenant_guard`
BEFORE INSERT ON `import_jobs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'import job tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `import_jobs_update_tenant_guard`
BEFORE UPDATE ON `import_jobs`
WHEN NEW.organization_id <> OLD.organization_id OR NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'import job tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `integration_logs_tenant_guard`
BEFORE INSERT ON `integration_logs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'integration log tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `integration_logs_update_tenant_guard`
BEFORE UPDATE ON `integration_logs`
WHEN NEW.organization_id <> OLD.organization_id OR NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'integration log tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `module_records_tenant_guard`
BEFORE INSERT ON `module_records`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'module record tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `module_records_update_tenant_guard`
BEFORE UPDATE ON `module_records`
WHEN NEW.organization_id <> OLD.organization_id OR NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'module record tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `workflow_transitions_tenant_guard`
BEFORE INSERT ON `workflow_transitions`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'workflow transition tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `workflow_transitions_update_tenant_guard`
BEFORE UPDATE ON `workflow_transitions`
WHEN NEW.organization_id <> OLD.organization_id OR NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'workflow transition tenant is invalid'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `notification_events_tenant_guard`
BEFORE INSERT ON `notification_events`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'notification event tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `notification_events_update_tenant_guard`
BEFORE UPDATE ON `notification_events`
WHEN NEW.organization_id <> OLD.organization_id OR NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'notification event tenant is invalid'); END;
