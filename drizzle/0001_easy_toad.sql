CREATE TABLE `discipline_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`details` text,
	`confidential` integer DEFAULT false NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discipline_student_idx` ON `discipline_incidents` (`organization_id`,`student_id`,`status`);--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`requester_type` text NOT NULL,
	`requester_id` text NOT NULL,
	`starts_on` integer NOT NULL,
	`ends_on` integer NOT NULL,
	`reason` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `leave_requests_scope_idx` ON `leave_requests` (`organization_id`,`requester_type`,`requester_id`,`status`);--> statement-breakpoint
CREATE TABLE `student_attendance_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`academic_year_id` text NOT NULL,
	`class_id` text NOT NULL,
	`section_id` text NOT NULL,
	`attendance_date` integer NOT NULL,
	`period_key` text DEFAULT 'daily' NOT NULL,
	`opened_by` text NOT NULL,
	`closed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `attendance_session_unique` ON `student_attendance_sessions` (`organization_id`,`class_id`,`section_id`,`attendance_date`,`period_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `attendance_sessions_scope_idx` ON `student_attendance_sessions` (`organization_id`,`campus_id`,`attendance_date`);--> statement-breakpoint
CREATE TABLE `admissions` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admissions_scope_idx` ON `admissions` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admissions_reference_idx` ON `admissions` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `admit_cards` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admit_cards_scope_idx` ON `admit_cards` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admit_cards_reference_idx` ON `admit_cards` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `application_assessments` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `application_assessments_scope_idx` ON `application_assessments` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `application_assessments_reference_idx` ON `application_assessments` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `application_documents` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `application_documents_scope_idx` ON `application_documents` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `application_documents_reference_idx` ON `application_documents` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `assignment_feedback` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `assignment_feedback_scope_idx` ON `assignment_feedback` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `assignment_feedback_reference_idx` ON `assignment_feedback` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `assignment_submissions` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `assignment_submissions_scope_idx` ON `assignment_submissions` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `assignment_submissions_reference_idx` ON `assignment_submissions` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `chapters` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chapters_scope_idx` ON `chapters` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chapters_reference_idx` ON `chapters` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `courses` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `courses_scope_idx` ON `courses` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `courses_reference_idx` ON `courses` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `curriculums` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `curriculums_scope_idx` ON `curriculums` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `curriculums_reference_idx` ON `curriculums` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `enquiry_follow_ups` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `enquiry_follow_ups_scope_idx` ON `enquiry_follow_ups` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `enquiry_follow_ups_reference_idx` ON `enquiry_follow_ups` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `exam_rooms` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_rooms_scope_idx` ON `exam_rooms` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_rooms_reference_idx` ON `exam_rooms` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `grievance_cases` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `grievance_cases_scope_idx` ON `grievance_cases` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `grievance_cases_reference_idx` ON `grievance_cases` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `invigilator_duties` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invigilator_duties_scope_idx` ON `invigilator_duties` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invigilator_duties_reference_idx` ON `invigilator_duties` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `learning_outcomes` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `learning_outcomes_scope_idx` ON `learning_outcomes` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `learning_outcomes_reference_idx` ON `learning_outcomes` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `leave_balances` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `leave_balances_scope_idx` ON `leave_balances` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `leave_balances_reference_idx` ON `leave_balances` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `leave_types` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `leave_types_scope_idx` ON `leave_types` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `leave_types_reference_idx` ON `leave_types` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `merit_demerit_events` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `merit_demerit_events_scope_idx` ON `merit_demerit_events` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `merit_demerit_events_reference_idx` ON `merit_demerit_events` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `online_tests` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `online_tests_scope_idx` ON `online_tests` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `online_tests_reference_idx` ON `online_tests` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `staff_attendance_records` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `staff_attendance_records_scope_idx` ON `staff_attendance_records` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `staff_attendance_records_reference_idx` ON `staff_attendance_records` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `student_subject_enrollments` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_subject_enrollments_scope_idx` ON `student_subject_enrollments` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_subject_enrollments_reference_idx` ON `student_subject_enrollments` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `substitutions` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `substitutions_scope_idx` ON `substitutions` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `substitutions_reference_idx` ON `substitutions` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `syllabus_maps` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `syllabus_maps_scope_idx` ON `syllabus_maps` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `syllabus_maps_reference_idx` ON `syllabus_maps` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `teacher_assignments` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teacher_assignments_scope_idx` ON `teacher_assignments` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teacher_assignments_reference_idx` ON `teacher_assignments` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `teaching_resources` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teaching_resources_scope_idx` ON `teaching_resources` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teaching_resources_reference_idx` ON `teaching_resources` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `test_answers` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `test_answers_scope_idx` ON `test_answers` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `test_answers_reference_idx` ON `test_answers` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `test_attempts` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `test_attempts_scope_idx` ON `test_attempts` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `test_attempts_reference_idx` ON `test_attempts` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `timetable_periods` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `timetable_periods_scope_idx` ON `timetable_periods` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `timetable_periods_reference_idx` ON `timetable_periods` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `timetable_templates` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `timetable_templates_scope_idx` ON `timetable_templates` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `timetable_templates_reference_idx` ON `timetable_templates` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `units` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `units_scope_idx` ON `units` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `units_reference_idx` ON `units` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `wellbeing_records` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `wellbeing_records_scope_idx` ON `wellbeing_records` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `wellbeing_records_reference_idx` ON `wellbeing_records` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `asset_assignments` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_assignments_scope_idx` ON `asset_assignments` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_assignments_reference_idx` ON `asset_assignments` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `asset_depreciation_entries` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_depreciation_entries_scope_idx` ON `asset_depreciation_entries` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_depreciation_entries_reference_idx` ON `asset_depreciation_entries` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `asset_maintenance_tickets` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_maintenance_tickets_scope_idx` ON `asset_maintenance_tickets` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `asset_maintenance_tickets_reference_idx` ON `asset_maintenance_tickets` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `assets` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `assets_scope_idx` ON `assets` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `assets_reference_idx` ON `assets` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `boarding_logs` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `boarding_logs_scope_idx` ON `boarding_logs` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `boarding_logs_reference_idx` ON `boarding_logs` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `canteen_transactions` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `canteen_transactions_scope_idx` ON `canteen_transactions` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `canteen_transactions_reference_idx` ON `canteen_transactions` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `cms_media` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cms_media_scope_idx` ON `cms_media` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cms_media_reference_idx` ON `cms_media` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `conductors` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `conductors_scope_idx` ON `conductors` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `conductors_reference_idx` ON `conductors` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `digital_resources` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `digital_resources_scope_idx` ON `digital_resources` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `digital_resources_reference_idx` ON `digital_resources` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `drivers` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `drivers_scope_idx` ON `drivers` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `drivers_reference_idx` ON `drivers` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `evacuation_roll_calls` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `evacuation_roll_calls_scope_idx` ON `evacuation_roll_calls` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `evacuation_roll_calls_reference_idx` ON `evacuation_roll_calls` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `facility_bookings` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `facility_bookings_scope_idx` ON `facility_bookings` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `facility_bookings_reference_idx` ON `facility_bookings` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `facility_maintenance_tickets` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `facility_maintenance_tickets_scope_idx` ON `facility_maintenance_tickets` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `facility_maintenance_tickets_reference_idx` ON `facility_maintenance_tickets` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `form_fields` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `form_fields_scope_idx` ON `form_fields` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `form_fields_reference_idx` ON `form_fields` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `forms` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `forms_scope_idx` ON `forms` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `forms_reference_idx` ON `forms` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `gate_passes` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `gate_passes_scope_idx` ON `gate_passes` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `gate_passes_reference_idx` ON `gate_passes` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `goods_receipts` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `goods_receipts_scope_idx` ON `goods_receipts` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `goods_receipts_reference_idx` ON `goods_receipts` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `health_screenings` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `health_screenings_scope_idx` ON `health_screenings` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `health_screenings_reference_idx` ON `health_screenings` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `hostel_attendance` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_attendance_scope_idx` ON `hostel_attendance` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_attendance_reference_idx` ON `hostel_attendance` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `hostel_beds` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_beds_scope_idx` ON `hostel_beds` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_beds_reference_idx` ON `hostel_beds` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `hostel_buildings` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_buildings_scope_idx` ON `hostel_buildings` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_buildings_reference_idx` ON `hostel_buildings` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `hostel_floors` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_floors_scope_idx` ON `hostel_floors` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_floors_reference_idx` ON `hostel_floors` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `hostel_outpasses` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_outpasses_scope_idx` ON `hostel_outpasses` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_outpasses_reference_idx` ON `hostel_outpasses` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `hostel_visitors` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_visitors_scope_idx` ON `hostel_visitors` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_visitors_reference_idx` ON `hostel_visitors` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `inventory_categories` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `inventory_categories_scope_idx` ON `inventory_categories` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `inventory_categories_reference_idx` ON `inventory_categories` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `library_fines` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `library_fines_scope_idx` ON `library_fines` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `library_fines_reference_idx` ON `library_fines` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `library_reservations` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `library_reservations_scope_idx` ON `library_reservations` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `library_reservations_reference_idx` ON `library_reservations` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `meal_plans` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `meal_plans_scope_idx` ON `meal_plans` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `meal_plans_reference_idx` ON `meal_plans` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `medication_logs` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `medication_logs_scope_idx` ON `medication_logs` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `medication_logs_reference_idx` ON `medication_logs` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `mess_menus` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mess_menus_scope_idx` ON `mess_menus` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mess_menus_reference_idx` ON `mess_menus` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `purchase_orders_scope_idx` ON `purchase_orders` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `purchase_orders_reference_idx` ON `purchase_orders` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `purchase_requisitions` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `purchase_requisitions_scope_idx` ON `purchase_requisitions` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `purchase_requisitions_reference_idx` ON `purchase_requisitions` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `route_stop_links` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `route_stop_links_scope_idx` ON `route_stop_links` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `route_stop_links_reference_idx` ON `route_stop_links` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `security_incidents` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `security_incidents_scope_idx` ON `security_incidents` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `security_incidents_reference_idx` ON `security_incidents` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `stock_locations` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stock_locations_scope_idx` ON `stock_locations` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stock_locations_reference_idx` ON `stock_locations` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `transport_incidents` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transport_incidents_scope_idx` ON `transport_incidents` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transport_incidents_reference_idx` ON `transport_incidents` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `transport_trips` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transport_trips_scope_idx` ON `transport_trips` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transport_trips_reference_idx` ON `transport_trips` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `vehicle_documents` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `vehicle_documents_scope_idx` ON `vehicle_documents` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `vehicle_documents_reference_idx` ON `vehicle_documents` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `visitor_logs` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `visitor_logs_scope_idx` ON `visitor_logs` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `visitor_logs_reference_idx` ON `visitor_logs` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `activity_registrations` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_registrations_scope_idx` ON `activity_registrations` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_registrations_reference_idx` ON `activity_registrations` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `alumni_events` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `alumni_events_scope_idx` ON `alumni_events` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `alumni_events_reference_idx` ON `alumni_events` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `club_memberships` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `club_memberships_scope_idx` ON `club_memberships` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `club_memberships_reference_idx` ON `club_memberships` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `employee_documents` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `employee_documents_scope_idx` ON `employee_documents` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `employee_documents_reference_idx` ON `employee_documents` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `event_registrations` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `event_registrations_scope_idx` ON `event_registrations` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `event_registrations_reference_idx` ON `event_registrations` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `events` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `events_scope_idx` ON `events` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `events_reference_idx` ON `events` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `job_applicants` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `job_applicants_scope_idx` ON `job_applicants` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `job_applicants_reference_idx` ON `job_applicants` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `job_board_posts` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `job_board_posts_scope_idx` ON `job_board_posts` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `job_board_posts_reference_idx` ON `job_board_posts` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `mentorships` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mentorships_scope_idx` ON `mentorships` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mentorships_reference_idx` ON `mentorships` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `message_recipients` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `message_recipients_scope_idx` ON `message_recipients` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `message_recipients_reference_idx` ON `message_recipients` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `message_templates` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `message_templates_scope_idx` ON `message_templates` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `message_templates_reference_idx` ON `message_templates` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `onboarding_tasks` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `onboarding_tasks_scope_idx` ON `onboarding_tasks` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `onboarding_tasks_reference_idx` ON `onboarding_tasks` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `payslips` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `payslips_scope_idx` ON `payslips` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `payslips_reference_idx` ON `payslips` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `ptm_bookings` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ptm_bookings_scope_idx` ON `ptm_bookings` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ptm_bookings_reference_idx` ON `ptm_bookings` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `ptm_slots` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ptm_slots_scope_idx` ON `ptm_slots` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ptm_slots_reference_idx` ON `ptm_slots` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `salary_components` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `salary_components_scope_idx` ON `salary_components` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `salary_components_reference_idx` ON `salary_components` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `salary_structures` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `salary_structures_scope_idx` ON `salary_structures` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `salary_structures_reference_idx` ON `salary_structures` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `sports_fixtures` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sports_fixtures_scope_idx` ON `sports_fixtures` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sports_fixtures_reference_idx` ON `sports_fixtures` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `sports_teams` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sports_teams_scope_idx` ON `sports_teams` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sports_teams_reference_idx` ON `sports_teams` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `staff_appraisals` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `staff_appraisals_scope_idx` ON `staff_appraisals` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `staff_appraisals_reference_idx` ON `staff_appraisals` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `training_events` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `training_events_scope_idx` ON `training_events` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `training_events_reference_idx` ON `training_events` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `api_keys` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `api_keys_scope_idx` ON `api_keys` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `api_keys_reference_idx` ON `api_keys` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `automation_jobs` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `automation_jobs_scope_idx` ON `automation_jobs` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `automation_jobs_reference_idx` ON `automation_jobs` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `batches` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `batches_scope_idx` ON `batches` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `batches_reference_idx` ON `batches` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `consent_records` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `consent_records_scope_idx` ON `consent_records` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `consent_records_reference_idx` ON `consent_records` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `custom_fields` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `custom_fields_scope_idx` ON `custom_fields` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `custom_fields_reference_idx` ON `custom_fields` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `custom_forms` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `custom_forms_scope_idx` ON `custom_forms` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `custom_forms_reference_idx` ON `custom_forms` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `export_jobs` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `export_jobs_scope_idx` ON `export_jobs` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `export_jobs_reference_idx` ON `export_jobs` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `grading_scales` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `grading_scales_scope_idx` ON `grading_scales` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `grading_scales_reference_idx` ON `grading_scales` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `holidays` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `holidays_scope_idx` ON `holidays` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `holidays_reference_idx` ON `holidays` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `import_job_rows` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `import_job_rows_scope_idx` ON `import_job_rows` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `import_job_rows_reference_idx` ON `import_job_rows` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `report_definitions` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `report_definitions_scope_idx` ON `report_definitions` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `report_definitions_reference_idx` ON `report_definitions` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `retention_policies` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `retention_policies_scope_idx` ON `retention_policies` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `retention_policies_reference_idx` ON `retention_policies` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `scheduled_reports` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `scheduled_reports_scope_idx` ON `scheduled_reports` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `scheduled_reports_reference_idx` ON `scheduled_reports` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `school_calendar_events` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `school_calendar_events_scope_idx` ON `school_calendar_events` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `school_calendar_events_reference_idx` ON `school_calendar_events` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `streams` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `streams_scope_idx` ON `streams` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `streams_reference_idx` ON `streams` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `subject_groups` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `subject_groups_scope_idx` ON `subject_groups` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `subject_groups_reference_idx` ON `subject_groups` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `support_tickets_scope_idx` ON `support_tickets` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `support_tickets_reference_idx` ON `support_tickets` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `webhook_events_scope_idx` ON `webhook_events` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `webhook_events_reference_idx` ON `webhook_events` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `workflow_definitions` (
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
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workflow_definitions_scope_idx` ON `workflow_definitions` (`organization_id`,`campus_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workflow_definitions_reference_idx` ON `workflow_definitions` (`organization_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `exam_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`exam_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`class_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`room_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_schedules_exam_idx` ON `exam_schedules` (`organization_id`,`exam_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `exam_schemes` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`academic_year_id` text NOT NULL,
	`name` text NOT NULL,
	`weightage` integer DEFAULT 100 NOT NULL,
	`configuration_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exam_schemes_year_idx` ON `exam_schemes` (`organization_id`,`academic_year_id`);--> statement-breakpoint
CREATE TABLE `exam_types` (
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
CREATE UNIQUE INDEX IF NOT EXISTS `exam_types_org_code_unique` ON `exam_types` (`organization_id`,`code`);--> statement-breakpoint
CREATE TABLE `grade_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`exam_scheme_id` text NOT NULL,
	`grade` text NOT NULL,
	`minimum_percent` integer NOT NULL,
	`maximum_percent` integer NOT NULL,
	`grade_point` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `grade_rules_scheme_idx` ON `grade_rules` (`organization_id`,`exam_scheme_id`);--> statement-breakpoint
CREATE TABLE `question_bank_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`subject_id` text NOT NULL,
	`question_type` text NOT NULL,
	`prompt` text NOT NULL,
	`answer_json` text,
	`maximum_marks` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `question_bank_subject_idx` ON `question_bank_items` (`organization_id`,`subject_id`,`question_type`);--> statement-breakpoint
CREATE TABLE `report_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	`summary_json` text NOT NULL,
	`generated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'generated' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `report_cards_exam_student_unique` ON `report_cards` (`exam_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`account_mask` text,
	`currency` text DEFAULT 'INR' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `bank_accounts_org_idx` ON `bank_accounts` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `chart_of_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`account_type` text NOT NULL,
	`parent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `accounts_org_code_unique` ON `chart_of_accounts` (`organization_id`,`code`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`account_id` text NOT NULL,
	`vendor_id` text,
	`description` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`incurred_on` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `expenses_scope_idx` ON `expenses` (`organization_id`,`incurred_on`,`status`);--> statement-breakpoint
CREATE TABLE `fee_installments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`fee_structure_id` text NOT NULL,
	`fee_head_id` text NOT NULL,
	`name` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`due_on` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `fee_installments_structure_idx` ON `fee_installments` (`organization_id`,`fee_structure_id`);--> statement-breakpoint
CREATE TABLE `fee_invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`invoice_id` text NOT NULL,
	`fee_head_id` text,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_amount_minor` integer NOT NULL,
	`total_minor` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invoice_items_invoice_idx` ON `fee_invoice_items` (`organization_id`,`invoice_id`);--> statement-breakpoint
CREATE TABLE `fee_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`payment_id` text NOT NULL,
	`receipt_number` text NOT NULL,
	`issued_at` integer NOT NULL,
	`issued_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'issued' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `receipts_payment_unique` ON `fee_receipts` (`payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `receipts_org_number_unique` ON `fee_receipts` (`organization_id`,`receipt_number`);--> statement-breakpoint
CREATE TABLE `fee_refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`payment_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`reason` text NOT NULL,
	`refunded_at` integer,
	`refunded_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `refunds_payment_idx` ON `fee_refunds` (`organization_id`,`payment_id`);--> statement-breakpoint
CREATE TABLE `fee_structures` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`academic_year_id` text NOT NULL,
	`class_id` text,
	`name` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`effective_from` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `fee_structures_scope_idx` ON `fee_structures` (`organization_id`,`academic_year_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `certificate_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`certificate_type` text NOT NULL,
	`name` text NOT NULL,
	`body_template` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `certificate_templates_org_idx` ON `certificate_templates` (`organization_id`,`certificate_type`);--> statement-breakpoint
CREATE TABLE `student_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`template_id` text,
	`certificate_number` text NOT NULL,
	`certificate_type` text NOT NULL,
	`verification_code` text NOT NULL,
	`issued_at` integer NOT NULL,
	`issued_by` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`original_certificate_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'issued' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `certificates_org_number_unique` ON `student_certificates` (`organization_id`,`certificate_number`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `certificates_verification_unique` ON `student_certificates` (`verification_code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `certificates_student_idx` ON `student_certificates` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `student_medical_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`allergies` text,
	`conditions` text,
	`medications` text,
	`emergency_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `student_medical_student_unique` ON `student_medical_profiles` (`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_medical_org_idx` ON `student_medical_profiles` (`organization_id`);--> statement-breakpoint
CREATE TABLE `student_timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`details_json` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_timeline_idx` ON `student_timeline_events` (`organization_id`,`student_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `delegated_access` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`user_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `delegated_access_user_idx` ON `delegated_access` (`organization_id`,`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `session_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`user_id` text NOT NULL,
	`firebase_session_id` text,
	`ip_address` text,
	`user_agent` text,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `session_logs_user_idx` ON `session_logs` (`organization_id`,`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	PRIMARY KEY(`user_id`, `role_id`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_roles_org_idx` ON `user_roles` (`organization_id`);--> statement-breakpoint
CREATE TABLE `module_records` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`module` text NOT NULL,
	`route` text NOT NULL,
	`entity_type` text NOT NULL,
	`name` text NOT NULL,
	`note` text,
	`data_json` text,
	`owner_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `module_records_scope_idx` ON `module_records` (`organization_id`,`campus_id`,`module`,`route`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `module_records_status_idx` ON `module_records` (`organization_id`,`module`,`status`);--> statement-breakpoint
CREATE TABLE `workflow_transitions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`reason` text,
	`transitioned_by` text NOT NULL,
	`transitioned_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workflow_transition_entity_idx` ON `workflow_transitions` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
ALTER TABLE `student_attendance_records` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `student_attendance_records` ADD `period_key` text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS `attendance_student_day_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_student_day_unique` ON `student_attendance_records` (`student_id`,`attendance_date`,`period_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_org_created_idx` ON `audit_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_entity_idx` ON `audit_logs` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `assignments_scope_idx` ON `assignments` (`organization_id`,`class_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lesson_plans_scope_idx` ON `lesson_plans` (`organization_id`,`class_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `clubs_org_idx` ON `clubs` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `achievements_student_idx` ON `student_achievements` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `enquiries_org_status_idx` ON `admissions_enquiries` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `applications_org_status_idx` ON `applications` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `alumni_org_idx` ON `alumni_profiles` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `attendance_corrections_org_idx` ON `attendance_correction_requests` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `attendance_scope_idx` ON `student_attendance_records` (`organization_id`,`class_id`,`section_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cms_pages_org_status_idx` ON `cms_pages` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `form_submissions_form_idx` ON `form_submissions` (`organization_id`,`form_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `messages_org_status_idx` ON `messages` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `notifications_recipient_idx` ON `notification_events` (`organization_id`,`recipient_user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exams_org_idx` ON `exams` (`organization_id`,`academic_year_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `marks_exam_student_subject_unique` ON `marks_entries` (`exam_id`,`student_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `marks_exam_idx` ON `marks_entries` (`organization_id`,`exam_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `result_publication_exam_unique` ON `result_publications` (`exam_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `fee_heads_org_code_unique` ON `fee_heads` (`organization_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `invoices_org_number_unique` ON `fee_invoices` (`organization_id`,`invoice_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invoices_student_idx` ON `fee_invoices` (`organization_id`,`student_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `payments_org_receipt_unique` ON `fee_payments` (`organization_id`,`receipt_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `payments_invoice_idx` ON `fee_payments` (`organization_id`,`invoice_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ledger_reference_idx` ON `ledger_entries` (`organization_id`,`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `academic_years_org_idx` ON `academic_years` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `academic_years_active_idx` ON `academic_years` (`organization_id`,`is_active`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `campuses_org_idx` ON `campuses` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `campuses_org_code_unique` ON `campuses` (`organization_id`,`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `classes_org_idx` ON `classes` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `classes_org_code_unique` ON `classes` (`organization_id`,`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `departments_org_idx` ON `departments` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `houses_org_idx` ON `houses` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sections_class_idx` ON `sections` (`organization_id`,`class_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `sections_class_name_unique` ON `sections` (`class_id`,`name`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `subjects_org_idx` ON `subjects` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `subjects_org_code_unique` ON `subjects` (`organization_id`,`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `terms_year_idx` ON `terms` (`organization_id`,`academic_year_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `clinic_visits_student_idx` ON `clinic_visits` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `health_profiles_student_idx` ON `health_profiles` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_allotments_student_idx` ON `hostel_allotments` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `hostel_rooms_org_idx` ON `hostel_rooms` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `employees_org_number_unique` ON `employees` (`organization_id`,`employee_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `employees_org_idx` ON `employees` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `payroll_org_period_idx` ON `payroll_runs` (`organization_id`,`period`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `import_jobs_org_idx` ON `import_jobs` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `integrations_org_provider_idx` ON `integration_configs` (`organization_id`,`provider`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stock_movements_item_idx` ON `stock_movements` (`organization_id`,`inventory_item_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `suppliers_org_idx` ON `suppliers` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `library_accession_unique` ON `library_copies` (`organization_id`,`accession_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `library_copies_item_idx` ON `library_copies` (`organization_id`,`item_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `library_issue_borrower_idx` ON `library_issue_transactions` (`organization_id`,`borrower_user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `integration_logs_org_idx` ON `integration_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `inventory_org_sku_unique` ON `inventory_items` (`organization_id`,`sku`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `library_org_idx` ON `library_items` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `notices_org_status_idx` ON `notices` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `routes_org_idx` ON `transport_routes` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `vehicles_org_reg_unique` ON `vehicles` (`organization_id`,`registration_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `alerts_org_status_idx` ON `alerts` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `reports_org_idx` ON `reports` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `documents_entity_idx` ON `document_files` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `enrollments_student_idx` ON `enrollments` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `enrollments_class_idx` ON `enrollments` (`organization_id`,`class_id`,`section_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `guardians_org_idx` ON `guardians` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_guardians_student_idx` ON `student_guardian_links` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `students_org_idx` ON `students` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `students_campus_idx` ON `students` (`organization_id`,`campus_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `students_admission_unique` ON `students` (`organization_id`,`admission_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `route_allocations_student_idx` ON `route_allocations` (`organization_id`,`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stops_org_idx` ON `transport_stops` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `login_audits_org_idx` ON `login_audits` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `permissions_key_unique` ON `permissions` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `roles_org_key_unique` ON `roles` (`organization_id`,`key`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_firebase_uid_unique` ON `users` (`firebase_uid`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `users_org_idx` ON `users` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `users_email_idx` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `user_class_section_scopes` ADD `organization_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exams` ADD `exam_scheme_id` text;--> statement-breakpoint
ALTER TABLE `exams` ADD `starts_on` integer;--> statement-breakpoint
ALTER TABLE `exams` ADD `ends_on` integer;--> statement-breakpoint
ALTER TABLE `fee_invoices` ADD `academic_year_id` text;--> statement-breakpoint
ALTER TABLE `fee_invoices` ADD `issued_on` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fee_invoices` ADD `currency` text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE `fee_payments` ADD `idempotency_key` text;--> statement-breakpoint
ALTER TABLE `fee_payments` ADD `provider_reference` text;--> statement-breakpoint
ALTER TABLE `document_files` ADD `width` integer;--> statement-breakpoint
ALTER TABLE `document_files` ADD `height` integer;--> statement-breakpoint
ALTER TABLE `document_files` ADD `version` integer;--> statement-breakpoint
ALTER TABLE `document_files` ADD `expires_at` integer;--> statement-breakpoint
ALTER TABLE `document_files` ADD `access_policy` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `guardians` ADD `address_json` text;--> statement-breakpoint
ALTER TABLE `guardians` ADD `custody_notes` text;--> statement-breakpoint
ALTER TABLE `students` ADD `email` text;--> statement-breakpoint
ALTER TABLE `students` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `students` ADD `address_json` text;--> statement-breakpoint
ALTER TABLE `students` ADD `blood_group` text;--> statement-breakpoint
ALTER TABLE `students` ADD `joined_on` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD `organization_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_campus_scopes` ADD `organization_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `linked_guardian_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `fee_invoices` SET `issued_on` = `created_at` WHERE `issued_on` = 0;--> statement-breakpoint
UPDATE `fee_payments` SET `idempotency_key` = 'legacy-' || `id` WHERE `idempotency_key` IS NULL;--> statement-breakpoint
UPDATE `students` SET `joined_on` = `created_at` WHERE `joined_on` = 0;--> statement-breakpoint
UPDATE `role_permissions` SET `organization_id` = COALESCE((SELECT `organization_id` FROM `roles` WHERE `roles`.`id` = `role_permissions`.`role_id`), '') WHERE `organization_id` = '';--> statement-breakpoint
UPDATE `user_campus_scopes` SET `organization_id` = COALESCE((SELECT `organization_id` FROM `users` WHERE `users`.`id` = `user_campus_scopes`.`user_id`), '') WHERE `organization_id` = '';--> statement-breakpoint
UPDATE `user_class_section_scopes` SET `organization_id` = COALESCE((SELECT `organization_id` FROM `users` WHERE `users`.`id` = `user_class_section_scopes`.`user_id`), ''), `section_id` = COALESCE(`section_id`, '*') WHERE `organization_id` = '';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `payments_org_idempotency_unique` ON `fee_payments` (`organization_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `role_permissions_org_idx` ON `role_permissions` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_campus_scopes_org_idx` ON `user_campus_scopes` (`organization_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_class_scopes_org_idx` ON `user_class_section_scopes` (`organization_id`);

