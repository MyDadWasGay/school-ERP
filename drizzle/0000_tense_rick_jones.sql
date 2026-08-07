CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`actor_user_id` text,
	`actor_role` text,
	`action` text NOT NULL,
	`module` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`before_json` text,
	`after_json` text,
	`metadata_json` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `audit_org_created_idx` ON `audit_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`teacher_id` text NOT NULL,
	`class_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`due_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'published' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assignments_scope_idx` ON `assignments` (`organization_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `lesson_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`teacher_id` text NOT NULL,
	`class_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`scheduled_for` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `lesson_plans_scope_idx` ON `lesson_plans` (`organization_id`,`class_id`,`subject_id`);--> statement-breakpoint
CREATE TABLE `clubs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`coordinator_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clubs_org_idx` ON `clubs` (`organization_id`);--> statement-breakpoint
CREATE TABLE `student_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`title` text NOT NULL,
	`achieved_on` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `achievements_student_idx` ON `student_achievements` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `admissions_enquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`applicant_name` text NOT NULL,
	`guardian_email` text,
	`source` text,
	`next_follow_up_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `enquiries_org_status_idx` ON `admissions_enquiries` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`application_number` text NOT NULL,
	`applicant_name` text NOT NULL,
	`applied_class_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'submitted' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `applications_org_status_idx` ON `applications` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `alumni_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text,
	`name` text NOT NULL,
	`graduation_year` text,
	`directory_visible` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `alumni_org_idx` ON `alumni_profiles` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `attendance_correction_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`attendance_id` text NOT NULL,
	`requested_state` text NOT NULL,
	`reason` text NOT NULL,
	`requested_by` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attendance_corrections_org_idx` ON `attendance_correction_requests` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `student_attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`class_id` text NOT NULL,
	`section_id` text NOT NULL,
	`attendance_date` integer NOT NULL,
	`state` text NOT NULL,
	`note` text,
	`marked_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_student_day_unique` ON `student_attendance_records` (`student_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX `attendance_scope_idx` ON `student_attendance_records` (`organization_id`,`class_id`,`section_id`,`attendance_date`);--> statement-breakpoint
CREATE TABLE `cms_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`seo_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cms_pages_org_status_idx` ON `cms_pages` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`form_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'received' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `form_submissions_form_idx` ON `form_submissions` (`organization_id`,`form_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`audience_json` text NOT NULL,
	`scheduled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_org_status_idx` ON `messages` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`recipient_user_id` text,
	`channel` text NOT NULL,
	`payload_json` text,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'queued' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notification_events` (`organization_id`,`recipient_user_id`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`academic_year_id` text NOT NULL,
	`name` text NOT NULL,
	`max_marks` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exams_org_idx` ON `exams` (`organization_id`,`academic_year_id`);--> statement-breakpoint
CREATE TABLE `marks_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`marks` integer,
	`state` text DEFAULT 'entered' NOT NULL,
	`entered_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marks_exam_student_subject_unique` ON `marks_entries` (`exam_id`,`student_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX `marks_exam_idx` ON `marks_entries` (`organization_id`,`exam_id`);--> statement-breakpoint
CREATE TABLE `result_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`exam_id` text NOT NULL,
	`published_at` integer,
	`published_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `result_publication_exam_unique` ON `result_publications` (`exam_id`);--> statement-breakpoint
CREATE TABLE `fee_heads` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fee_heads_org_code_unique` ON `fee_heads` (`organization_id`,`code`);--> statement-breakpoint
CREATE TABLE `fee_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`due_on` integer NOT NULL,
	`total_minor` integer NOT NULL,
	`balance_minor` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_org_number_unique` ON `fee_invoices` (`organization_id`,`invoice_number`);--> statement-breakpoint
CREATE INDEX `invoices_student_idx` ON `fee_invoices` (`organization_id`,`student_id`,`status`);--> statement-breakpoint
CREATE TABLE `fee_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`invoice_id` text NOT NULL,
	`student_id` text NOT NULL,
	`receipt_number` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`method` text NOT NULL,
	`paid_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'posted' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_org_receipt_unique` ON `fee_payments` (`organization_id`,`receipt_number`);--> statement-breakpoint
CREATE INDEX `payments_invoice_idx` ON `fee_payments` (`organization_id`,`invoice_id`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`reference_type` text NOT NULL,
	`reference_id` text NOT NULL,
	`account` text NOT NULL,
	`debit_minor` integer DEFAULT 0 NOT NULL,
	`credit_minor` integer DEFAULT 0 NOT NULL,
	`posted_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'posted' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ledger_reference_idx` ON `ledger_entries` (`organization_id`,`reference_type`,`reference_id`);--> statement-breakpoint
CREATE TABLE `academic_years` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`starts_on` integer NOT NULL,
	`ends_on` integer NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `academic_years_org_idx` ON `academic_years` (`organization_id`);--> statement-breakpoint
CREATE INDEX `academic_years_active_idx` ON `academic_years` (`organization_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `campuses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`address` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campuses_org_idx` ON `campuses` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `campuses_org_code_unique` ON `campuses` (`organization_id`,`code`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `classes_org_idx` ON `classes` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `classes_org_code_unique` ON `classes` (`organization_id`,`code`);--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `departments_org_idx` ON `departments` (`organization_id`);--> statement-breakpoint
CREATE TABLE `houses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `houses_org_idx` ON `houses` (`organization_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`class_id` text NOT NULL,
	`name` text NOT NULL,
	`capacity` integer DEFAULT 40 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sections_class_idx` ON `sections` (`organization_id`,`class_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sections_class_name_unique` ON `sections` (`class_id`,`name`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`is_optional` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subjects_org_idx` ON `subjects` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_org_code_unique` ON `subjects` (`organization_id`,`code`);--> statement-breakpoint
CREATE TABLE `terms` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`academic_year_id` text NOT NULL,
	`name` text NOT NULL,
	`starts_on` integer NOT NULL,
	`ends_on` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `terms_year_idx` ON `terms` (`organization_id`,`academic_year_id`);--> statement-breakpoint
CREATE TABLE `clinic_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`visited_at` integer NOT NULL,
	`summary` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clinic_visits_student_idx` ON `clinic_visits` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `health_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`allergies` text,
	`conditions` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `health_profiles_student_idx` ON `health_profiles` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `hostel_allotments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`room_id` text NOT NULL,
	`student_id` text NOT NULL,
	`allotted_on` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hostel_allotments_student_idx` ON `hostel_allotments` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `hostel_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`building` text NOT NULL,
	`room_number` text NOT NULL,
	`capacity` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hostel_rooms_org_idx` ON `hostel_rooms` (`organization_id`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`employee_number` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`department_id` text,
	`joined_on` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_org_number_unique` ON `employees` (`organization_id`,`employee_number`);--> statement-breakpoint
CREATE INDEX `employees_org_idx` ON `employees` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`period` text NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`processed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payroll_org_period_idx` ON `payroll_runs` (`organization_id`,`period`);--> statement-breakpoint
CREATE TABLE `import_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`entity_type` text NOT NULL,
	`total_rows` integer DEFAULT 0 NOT NULL,
	`error_rows` integer DEFAULT 0 NOT NULL,
	`errors_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'queued' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `import_jobs_org_idx` ON `import_jobs` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `integration_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`provider` text NOT NULL,
	`config_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'configured' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `integrations_org_provider_idx` ON `integration_configs` (`organization_id`,`provider`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`inventory_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`direction` text NOT NULL,
	`reference` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'posted' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stock_movements_item_idx` ON `stock_movements` (`organization_id`,`inventory_item_id`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`contact_email` text,
	`phone` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `suppliers_org_idx` ON `suppliers` (`organization_id`);--> statement-breakpoint
CREATE TABLE `library_copies` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`item_id` text NOT NULL,
	`accession_number` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'available' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `library_accession_unique` ON `library_copies` (`organization_id`,`accession_number`);--> statement-breakpoint
CREATE INDEX `library_copies_item_idx` ON `library_copies` (`organization_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `library_issue_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`copy_id` text NOT NULL,
	`borrower_user_id` text NOT NULL,
	`issued_at` integer NOT NULL,
	`returned_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'issued' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `library_issue_borrower_idx` ON `library_issue_transactions` (`organization_id`,`borrower_user_id`);--> statement-breakpoint
CREATE TABLE `integration_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'received' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `integration_logs_org_idx` ON `integration_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`reorder_level` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_org_sku_unique` ON `inventory_items` (`organization_id`,`sku`);--> statement-breakpoint
CREATE TABLE `library_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`title` text NOT NULL,
	`author` text,
	`isbn` text,
	`total_copies` integer DEFAULT 0 NOT NULL,
	`available_copies` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `library_org_idx` ON `library_items` (`organization_id`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`audience` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notices_org_status_idx` ON `notices` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `transport_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`vehicle_id` text,
	`capacity` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `routes_org_idx` ON `transport_routes` (`organization_id`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`registration_number` text NOT NULL,
	`type` text NOT NULL,
	`capacity` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_org_reg_unique` ON `vehicles` (`organization_id`,`registration_number`);--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`source_type` text,
	`source_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `alerts_org_status_idx` ON `alerts` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`report_type` text NOT NULL,
	`definition_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_org_idx` ON `reports` (`organization_id`);--> statement-breakpoint
CREATE TABLE `document_files` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`category` text NOT NULL,
	`cloudinary_public_id` text NOT NULL,
	`secure_url` text NOT NULL,
	`resource_type` text NOT NULL,
	`format` text,
	`bytes` integer,
	`original_filename` text,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_entity_idx` ON `document_files` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`class_id` text NOT NULL,
	`section_id` text NOT NULL,
	`roll_number` text,
	`starts_on` integer NOT NULL,
	`ends_on` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `enrollments_student_idx` ON `enrollments` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `enrollments_class_idx` ON `enrollments` (`organization_id`,`class_id`,`section_id`);--> statement-breakpoint
CREATE TABLE `guardians` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`occupation` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guardians_org_idx` ON `guardians` (`organization_id`);--> statement-breakpoint
CREATE TABLE `student_guardian_links` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`guardian_id` text NOT NULL,
	`relationship` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `student_guardians_student_idx` ON `student_guardian_links` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`admission_number` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`date_of_birth` integer,
	`gender` text,
	`photo_url` text,
	`house_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `students_org_idx` ON `students` (`organization_id`);--> statement-breakpoint
CREATE INDEX `students_campus_idx` ON `students` (`organization_id`,`campus_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_admission_unique` ON `students` (`organization_id`,`admission_number`);--> statement-breakpoint
CREATE TABLE `route_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`route_id` text NOT NULL,
	`student_id` text NOT NULL,
	`stop_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `route_allocations_student_idx` ON `route_allocations` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `transport_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`address` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stops_org_idx` ON `transport_stops` (`organization_id`);--> statement-breakpoint
CREATE TABLE `login_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`user_id` text,
	`email` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`success` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `login_audits_org_idx` ON `login_audits` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`module` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_key_unique` ON `permissions` (`key`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	PRIMARY KEY(`role_id`, `permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_org_key_unique` ON `roles` (`organization_id`,`key`);--> statement-breakpoint
CREATE TABLE `user_campus_scopes` (
	`user_id` text NOT NULL,
	`campus_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	PRIMARY KEY(`user_id`, `campus_id`)
);
--> statement-breakpoint
CREATE TABLE `user_class_section_scopes` (
	`user_id` text NOT NULL,
	`class_id` text NOT NULL,
	`section_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	PRIMARY KEY(`user_id`, `class_id`, `section_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`firebase_uid` text NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`linked_student_id` text,
	`linked_employee_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_firebase_uid_unique` ON `users` (`firebase_uid`);--> statement-breakpoint
CREATE INDEX `users_org_idx` ON `users` (`organization_id`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);