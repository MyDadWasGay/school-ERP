ALTER TABLE `employees` ADD COLUMN `email` text;
--> statement-breakpoint
ALTER TABLE `employees` ADD COLUMN `job_title` text;
--> statement-breakpoint
ALTER TABLE `employees` ADD COLUMN `manager_id` text;
--> statement-breakpoint
ALTER TABLE `employees` ADD COLUMN `linked_user_id` text;
--> statement-breakpoint
ALTER TABLE `employees` ADD COLUMN `salary_minor` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD COLUMN `period_start` integer;
--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD COLUMN `period_end` integer;
--> statement-breakpoint
CREATE INDEX `employees_linked_user_idx` ON `employees` (`organization_id`,`linked_user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_org_campus_period_unique` ON `payroll_runs` (`organization_id`,`campus_id`,`period`);
--> statement-breakpoint
CREATE TABLE `payroll_payslips` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`payroll_run_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`employee_number` text NOT NULL,
	`employee_name` text NOT NULL,
	`period` text NOT NULL,
	`gross_minor` integer NOT NULL,
	`deductions_minor` integer DEFAULT 0 NOT NULL,
	`net_minor` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`issued_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'issued' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payslip_run_employee_unique` ON `payroll_payslips` (`payroll_run_id`,`employee_id`);
--> statement-breakpoint
CREATE INDEX `payslip_org_period_idx` ON `payroll_payslips` (`organization_id`,`period`);
--> statement-breakpoint
CREATE INDEX `payslip_employee_idx` ON `payroll_payslips` (`organization_id`,`employee_id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `employees_hr_scope_guard`
BEFORE INSERT ON `employees`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR (NEW.linked_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.linked_user_id AND organization_id = NEW.organization_id))
  OR (NEW.manager_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `employees` WHERE id = NEW.manager_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'employee tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `employees_hr_scope_update_guard`
BEFORE UPDATE ON `employees`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
  OR (NEW.linked_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `users` WHERE id = NEW.linked_user_id AND organization_id = NEW.organization_id))
  OR (NEW.manager_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `employees` WHERE id = NEW.manager_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'employee tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `payroll_runs_scope_guard`
BEFORE INSERT ON `payroll_runs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'payroll run tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `payroll_runs_scope_update_guard`
BEFORE UPDATE ON `payroll_runs`
WHEN NEW.organization_id <> OLD.organization_id
  OR (NEW.campus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `campuses` WHERE id = NEW.campus_id AND organization_id = NEW.organization_id))
BEGIN SELECT RAISE(ABORT, 'payroll run tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `payroll_payslips_tenant_guard`
BEFORE INSERT ON `payroll_payslips`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `payroll_runs` WHERE id = NEW.payroll_run_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `employees` WHERE id = NEW.employee_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'payslip tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `payroll_payslips_update_tenant_guard`
BEFORE UPDATE ON `payroll_payslips`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (SELECT 1 FROM `payroll_runs` WHERE id = NEW.payroll_run_id AND organization_id = NEW.organization_id)
  OR NOT EXISTS (SELECT 1 FROM `employees` WHERE id = NEW.employee_id AND organization_id = NEW.organization_id)
BEGIN SELECT RAISE(ABORT, 'payslip tenant is invalid'); END;
