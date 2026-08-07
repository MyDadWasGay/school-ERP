/*
  The original schema intentionally used application-level tenant columns
  without foreign keys. These triggers add database-enforced relationship
  checks without rebuilding Turso/SQLite tables. They cover the identity,
  academic, student, attendance, assessment, admissions, and finance paths
  that can expose or mutate sensitive school data.
*/
CREATE TRIGGER IF NOT EXISTS `campuses_tenant_guard`
BEFORE INSERT ON `campuses`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'campus organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `academic_years_tenant_guard`
BEFORE INSERT ON `academic_years`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'academic year organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `terms_tenant_guard`
BEFORE INSERT ON `terms`
WHEN NOT EXISTS (
  SELECT 1 FROM `academic_years`
  WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'term academic year is outside organization'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `classes_tenant_guard`
BEFORE INSERT ON `classes`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'class organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sections_tenant_guard`
BEFORE INSERT ON `sections`
WHEN NOT EXISTS (
  SELECT 1 FROM `classes`
  WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'section class is outside organization'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `subjects_tenant_guard`
BEFORE INSERT ON `subjects`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'subject organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `houses_tenant_guard`
BEFORE INSERT ON `houses`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'house organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `departments_tenant_guard`
BEFORE INSERT ON `departments`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'department organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `users_tenant_guard`
BEFORE INSERT ON `users`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'user tenant or campus is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `roles_tenant_guard`
BEFORE INSERT ON `roles`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'role organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `role_permissions_tenant_guard`
BEFORE INSERT ON `role_permissions`
WHEN NOT EXISTS (
  SELECT 1 FROM `roles`
  WHERE `id` = NEW.`role_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (SELECT 1 FROM `permissions` WHERE `id` = NEW.`permission_id`)
BEGIN SELECT RAISE(ABORT, 'role permission tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_roles_tenant_guard`
BEFORE INSERT ON `user_roles`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `roles`
    WHERE `id` = NEW.`role_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'user role tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_campus_scopes_tenant_guard`
BEFORE INSERT ON `user_campus_scopes`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'user campus scope tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_class_scopes_tenant_guard`
BEFORE INSERT ON `user_class_section_scopes`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `sections`
    WHERE `id` = NEW.`section_id` AND `organization_id` = NEW.`organization_id` AND `class_id` = NEW.`class_id`
  )
BEGIN SELECT RAISE(ABORT, 'user class scope tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `delegated_access_tenant_guard`
BEFORE INSERT ON `delegated_access`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`granted_by` AND `organization_id` = NEW.`organization_id`
  )
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'delegated access tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `session_logs_tenant_guard`
BEFORE INSERT ON `session_logs`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'session user tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `login_audits_tenant_guard`
BEFORE INSERT ON `login_audits`
WHEN NEW.`user_id` IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'login audit user tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `audit_logs_tenant_guard`
BEFORE INSERT ON `audit_logs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
  OR (NEW.`actor_user_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`actor_user_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'audit log tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `students_tenant_guard`
BEFORE INSERT ON `students`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR (NEW.`house_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `houses`
    WHERE `id` = NEW.`house_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'student tenant or campus is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `guardians_tenant_guard`
BEFORE INSERT ON `guardians`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'guardian organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_guardian_links_tenant_guard`
BEFORE INSERT ON `student_guardian_links`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `guardians`
    WHERE `id` = NEW.`guardian_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'student guardian link tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `enrollments_tenant_guard`
BEFORE INSERT ON `enrollments`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `academic_years`
    WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `sections`
    WHERE `id` = NEW.`section_id` AND `organization_id` = NEW.`organization_id` AND `class_id` = NEW.`class_id`
  )
BEGIN SELECT RAISE(ABORT, 'enrollment tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_medical_tenant_guard`
BEFORE INSERT ON `student_medical_profiles`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'medical profile tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_timeline_tenant_guard`
BEFORE INSERT ON `student_timeline_events`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'student timeline tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_certificates_tenant_guard`
BEFORE INSERT ON `student_certificates`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`template_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `certificate_templates`
    WHERE `id` = NEW.`template_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`issued_by` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'student certificate tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `attendance_sessions_tenant_guard`
BEFORE INSERT ON `student_attendance_sessions`
WHEN NOT EXISTS (
  SELECT 1 FROM `academic_years`
  WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `sections`
    WHERE `id` = NEW.`section_id` AND `organization_id` = NEW.`organization_id` AND `class_id` = NEW.`class_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`opened_by` AND `organization_id` = NEW.`organization_id`
  )
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'attendance session tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `attendance_records_tenant_guard`
BEFORE INSERT ON `student_attendance_records`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`marked_by` AND `organization_id` = NEW.`organization_id`
  )
  OR (NEW.`session_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `student_attendance_sessions`
    WHERE `id` = NEW.`session_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'attendance record tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `exams_tenant_guard`
BEFORE INSERT ON `exams`
WHEN NOT EXISTS (
  SELECT 1 FROM `academic_years`
  WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`exam_scheme_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `exam_schemes`
    WHERE `id` = NEW.`exam_scheme_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'exam tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `marks_tenant_guard`
BEFORE INSERT ON `marks_entries`
WHEN NOT EXISTS (
  SELECT 1 FROM `exams`
  WHERE `id` = NEW.`exam_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `students`
    WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `subjects`
    WHERE `id` = NEW.`subject_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`entered_by` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'marks tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `result_publications_tenant_guard`
BEFORE INSERT ON `result_publications`
WHEN NOT EXISTS (
  SELECT 1 FROM `exams`
  WHERE `id` = NEW.`exam_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'result publication tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `applications_tenant_guard`
BEFORE INSERT ON `applications`
WHEN (NEW.`academic_year_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `academic_years`
    WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR (NEW.`applied_class_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`applied_class_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR (NEW.`applied_section_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `sections`
    WHERE `id` = NEW.`applied_section_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR (NEW.`source_enquiry_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `admissions_enquiries`
    WHERE `id` = NEW.`source_enquiry_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'application tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_structures_tenant_guard`
BEFORE INSERT ON `fee_structures`
WHEN NOT EXISTS (
  SELECT 1 FROM `academic_years`
  WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`class_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'fee structure tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_installments_tenant_guard`
BEFORE INSERT ON `fee_installments`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_structures`
  WHERE `id` = NEW.`fee_structure_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `fee_heads`
    WHERE `id` = NEW.`fee_head_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'fee installment tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_invoices_tenant_guard`
BEFORE INSERT ON `fee_invoices`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`academic_year_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `academic_years`
    WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'fee invoice tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_invoice_items_tenant_guard`
BEFORE INSERT ON `fee_invoice_items`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_invoices`
  WHERE `id` = NEW.`invoice_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`fee_head_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `fee_heads`
    WHERE `id` = NEW.`fee_head_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'fee invoice item tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_payments_tenant_guard`
BEFORE INSERT ON `fee_payments`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_invoices`
  WHERE `id` = NEW.`invoice_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `students`
    WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'fee payment tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_receipts_tenant_guard`
BEFORE INSERT ON `fee_receipts`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_payments`
  WHERE `id` = NEW.`payment_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`issued_by` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'fee receipt tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_refunds_tenant_guard`
BEFORE INSERT ON `fee_refunds`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_payments`
  WHERE `id` = NEW.`payment_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`refunded_by` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`refunded_by` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'fee refund tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `employees_tenant_guard`
BEFORE INSERT ON `employees`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
  OR (NEW.`department_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `departments`
    WHERE `id` = NEW.`department_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'employee tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `payroll_runs_tenant_guard`
BEFORE INSERT ON `payroll_runs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'payroll tenant is invalid'); END;
--> statement-breakpoint
/* Update guards mirror the insert guards for tenant-key changes. */
/*
  The original schema intentionally used application-level tenant columns
  without foreign keys. These triggers add database-enforced relationship
  checks without rebuilding Turso/SQLite tables. They cover the identity,
  academic, student, attendance, assessment, admissions, and finance paths
  that can expose or mutate sensitive school data.
*/
CREATE TRIGGER IF NOT EXISTS `update_campuses_tenant_guard`
BEFORE UPDATE ON `campuses`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'campus organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_academic_years_tenant_guard`
BEFORE UPDATE ON `academic_years`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'academic year organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_terms_tenant_guard`
BEFORE UPDATE ON `terms`
WHEN NOT EXISTS (
  SELECT 1 FROM `academic_years`
  WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'term academic year is outside organization'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_classes_tenant_guard`
BEFORE UPDATE ON `classes`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'class organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_sections_tenant_guard`
BEFORE UPDATE ON `sections`
WHEN NOT EXISTS (
  SELECT 1 FROM `classes`
  WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'section class is outside organization'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_subjects_tenant_guard`
BEFORE UPDATE ON `subjects`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'subject organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_houses_tenant_guard`
BEFORE UPDATE ON `houses`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'house organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_departments_tenant_guard`
BEFORE UPDATE ON `departments`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'department organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_users_tenant_guard`
BEFORE UPDATE ON `users`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'user tenant or campus is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_roles_tenant_guard`
BEFORE UPDATE ON `roles`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'role organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_role_permissions_tenant_guard`
BEFORE UPDATE ON `role_permissions`
WHEN NOT EXISTS (
  SELECT 1 FROM `roles`
  WHERE `id` = NEW.`role_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (SELECT 1 FROM `permissions` WHERE `id` = NEW.`permission_id`)
BEGIN SELECT RAISE(ABORT, 'role permission tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_user_roles_tenant_guard`
BEFORE UPDATE ON `user_roles`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `roles`
    WHERE `id` = NEW.`role_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'user role tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_user_campus_scopes_tenant_guard`
BEFORE UPDATE ON `user_campus_scopes`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'user campus scope tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_user_class_scopes_tenant_guard`
BEFORE UPDATE ON `user_class_section_scopes`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `sections`
    WHERE `id` = NEW.`section_id` AND `organization_id` = NEW.`organization_id` AND `class_id` = NEW.`class_id`
  )
BEGIN SELECT RAISE(ABORT, 'user class scope tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_delegated_access_tenant_guard`
BEFORE UPDATE ON `delegated_access`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`granted_by` AND `organization_id` = NEW.`organization_id`
  )
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'delegated access tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_session_logs_tenant_guard`
BEFORE UPDATE ON `session_logs`
WHEN NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'session user tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_login_audits_tenant_guard`
BEFORE UPDATE ON `login_audits`
WHEN NEW.`user_id` IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM `users`
  WHERE `id` = NEW.`user_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'login audit user tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_audit_logs_tenant_guard`
BEFORE UPDATE ON `audit_logs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
  OR (NEW.`actor_user_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`actor_user_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'audit log tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_students_tenant_guard`
BEFORE UPDATE ON `students`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR (NEW.`house_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `houses`
    WHERE `id` = NEW.`house_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'student tenant or campus is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_guardians_tenant_guard`
BEFORE UPDATE ON `guardians`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'guardian organization does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_student_guardian_links_tenant_guard`
BEFORE UPDATE ON `student_guardian_links`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `guardians`
    WHERE `id` = NEW.`guardian_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'student guardian link tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_enrollments_tenant_guard`
BEFORE UPDATE ON `enrollments`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `academic_years`
    WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `sections`
    WHERE `id` = NEW.`section_id` AND `organization_id` = NEW.`organization_id` AND `class_id` = NEW.`class_id`
  )
BEGIN SELECT RAISE(ABORT, 'enrollment tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_student_medical_tenant_guard`
BEFORE UPDATE ON `student_medical_profiles`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'medical profile tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_student_timeline_tenant_guard`
BEFORE UPDATE ON `student_timeline_events`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'student timeline tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_student_certificates_tenant_guard`
BEFORE UPDATE ON `student_certificates`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`template_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `certificate_templates`
    WHERE `id` = NEW.`template_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`issued_by` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'student certificate tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_attendance_sessions_tenant_guard`
BEFORE UPDATE ON `student_attendance_sessions`
WHEN NOT EXISTS (
  SELECT 1 FROM `academic_years`
  WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `sections`
    WHERE `id` = NEW.`section_id` AND `organization_id` = NEW.`organization_id` AND `class_id` = NEW.`class_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`opened_by` AND `organization_id` = NEW.`organization_id`
  )
  OR (NEW.`campus_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `campuses`
    WHERE `id` = NEW.`campus_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'attendance session tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_attendance_records_tenant_guard`
BEFORE UPDATE ON `student_attendance_records`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`marked_by` AND `organization_id` = NEW.`organization_id`
  )
  OR (NEW.`session_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `student_attendance_sessions`
    WHERE `id` = NEW.`session_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'attendance record tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_exams_tenant_guard`
BEFORE UPDATE ON `exams`
WHEN NOT EXISTS (
  SELECT 1 FROM `academic_years`
  WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`exam_scheme_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `exam_schemes`
    WHERE `id` = NEW.`exam_scheme_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'exam tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_marks_tenant_guard`
BEFORE UPDATE ON `marks_entries`
WHEN NOT EXISTS (
  SELECT 1 FROM `exams`
  WHERE `id` = NEW.`exam_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `students`
    WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `subjects`
    WHERE `id` = NEW.`subject_id` AND `organization_id` = NEW.`organization_id`
  )
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`entered_by` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'marks tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_result_publications_tenant_guard`
BEFORE UPDATE ON `result_publications`
WHEN NOT EXISTS (
  SELECT 1 FROM `exams`
  WHERE `id` = NEW.`exam_id` AND `organization_id` = NEW.`organization_id`
)
BEGIN SELECT RAISE(ABORT, 'result publication tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_applications_tenant_guard`
BEFORE UPDATE ON `applications`
WHEN (NEW.`academic_year_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `academic_years`
    WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR (NEW.`applied_class_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`applied_class_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR (NEW.`applied_section_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `sections`
    WHERE `id` = NEW.`applied_section_id` AND `organization_id` = NEW.`organization_id`
  ))
  OR (NEW.`source_enquiry_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `admissions_enquiries`
    WHERE `id` = NEW.`source_enquiry_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'application tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_fee_structures_tenant_guard`
BEFORE UPDATE ON `fee_structures`
WHEN NOT EXISTS (
  SELECT 1 FROM `academic_years`
  WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`class_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `classes`
    WHERE `id` = NEW.`class_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'fee structure tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_fee_installments_tenant_guard`
BEFORE UPDATE ON `fee_installments`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_structures`
  WHERE `id` = NEW.`fee_structure_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `fee_heads`
    WHERE `id` = NEW.`fee_head_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'fee installment tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_fee_invoices_tenant_guard`
BEFORE UPDATE ON `fee_invoices`
WHEN NOT EXISTS (
  SELECT 1 FROM `students`
  WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`academic_year_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `academic_years`
    WHERE `id` = NEW.`academic_year_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'fee invoice tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_fee_invoice_items_tenant_guard`
BEFORE UPDATE ON `fee_invoice_items`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_invoices`
  WHERE `id` = NEW.`invoice_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`fee_head_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `fee_heads`
    WHERE `id` = NEW.`fee_head_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'fee invoice item tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_fee_payments_tenant_guard`
BEFORE UPDATE ON `fee_payments`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_invoices`
  WHERE `id` = NEW.`invoice_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `students`
    WHERE `id` = NEW.`student_id` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'fee payment tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_fee_receipts_tenant_guard`
BEFORE UPDATE ON `fee_receipts`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_payments`
  WHERE `id` = NEW.`payment_id` AND `organization_id` = NEW.`organization_id`
)
  OR NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`issued_by` AND `organization_id` = NEW.`organization_id`
  )
BEGIN SELECT RAISE(ABORT, 'fee receipt tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_fee_refunds_tenant_guard`
BEFORE UPDATE ON `fee_refunds`
WHEN NOT EXISTS (
  SELECT 1 FROM `fee_payments`
  WHERE `id` = NEW.`payment_id` AND `organization_id` = NEW.`organization_id`
)
  OR (NEW.`refunded_by` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `users`
    WHERE `id` = NEW.`refunded_by` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'fee refund tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_employees_tenant_guard`
BEFORE UPDATE ON `employees`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
  OR (NEW.`department_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `departments`
    WHERE `id` = NEW.`department_id` AND `organization_id` = NEW.`organization_id`
  ))
BEGIN SELECT RAISE(ABORT, 'employee tenant is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `update_payroll_runs_tenant_guard`
BEFORE UPDATE ON `payroll_runs`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE `id` = NEW.`organization_id`)
BEGIN SELECT RAISE(ABORT, 'payroll tenant is invalid'); END;
--> statement-breakpoint
/* Tenant ownership is immutable; records must move through an audited domain workflow. */
CREATE TRIGGER IF NOT EXISTS `campuses_organization_immutable_guard`
BEFORE UPDATE ON `campuses`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'campus organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `academic_years_organization_immutable_guard`
BEFORE UPDATE ON `academic_years`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'academic year organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `terms_organization_immutable_guard`
BEFORE UPDATE ON `terms`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'term organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `classes_organization_immutable_guard`
BEFORE UPDATE ON `classes`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'class organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sections_organization_immutable_guard`
BEFORE UPDATE ON `sections`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'section organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `subjects_organization_immutable_guard`
BEFORE UPDATE ON `subjects`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'subject organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `users_organization_immutable_guard`
BEFORE UPDATE ON `users`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'user organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `roles_organization_immutable_guard`
BEFORE UPDATE ON `roles`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'role organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_scopes_organization_immutable_guard`
BEFORE UPDATE ON `user_campus_scopes`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'user campus scope organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `class_scopes_organization_immutable_guard`
BEFORE UPDATE ON `user_class_section_scopes`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'user class scope organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `students_organization_immutable_guard`
BEFORE UPDATE ON `students`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'student organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `guardians_organization_immutable_guard`
BEFORE UPDATE ON `guardians`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'guardian organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_guardian_links_organization_immutable_guard`
BEFORE UPDATE ON `student_guardian_links`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'student guardian link organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `enrollments_organization_immutable_guard`
BEFORE UPDATE ON `enrollments`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'enrollment organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `attendance_sessions_organization_immutable_guard`
BEFORE UPDATE ON `student_attendance_sessions`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'attendance session organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `attendance_records_organization_immutable_guard`
BEFORE UPDATE ON `student_attendance_records`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'attendance record organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `exams_organization_immutable_guard`
BEFORE UPDATE ON `exams`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'exam organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `marks_organization_immutable_guard`
BEFORE UPDATE ON `marks_entries`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'marks organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `applications_organization_immutable_guard`
BEFORE UPDATE ON `applications`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'application organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_structures_organization_immutable_guard`
BEFORE UPDATE ON `fee_structures`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'fee structure organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_invoices_organization_immutable_guard`
BEFORE UPDATE ON `fee_invoices`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'fee invoice organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_payments_organization_immutable_guard`
BEFORE UPDATE ON `fee_payments`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'fee payment organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_receipts_organization_immutable_guard`
BEFORE UPDATE ON `fee_receipts`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'fee receipt organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `fee_refunds_organization_immutable_guard`
BEFORE UPDATE ON `fee_refunds`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'fee refund organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `employees_organization_immutable_guard`
BEFORE UPDATE ON `employees`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'employee organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `payroll_runs_organization_immutable_guard`
BEFORE UPDATE ON `payroll_runs`
WHEN NEW.`organization_id` <> OLD.`organization_id`
BEGIN SELECT RAISE(ABORT, 'payroll organization is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_guardian_link_duplicate_guard`
BEFORE INSERT ON `student_guardian_links`
WHEN EXISTS (
  SELECT 1 FROM `student_guardian_links`
  WHERE `organization_id` = NEW.`organization_id`
    AND `student_id` = NEW.`student_id`
    AND `guardian_id` = NEW.`guardian_id`
)
BEGIN SELECT RAISE(ABORT, 'student guardian link already exists'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_guardian_link_update_duplicate_guard`
BEFORE UPDATE ON `student_guardian_links`
WHEN EXISTS (
  SELECT 1 FROM `student_guardian_links`
  WHERE `organization_id` = NEW.`organization_id`
    AND `student_id` = NEW.`student_id`
    AND `guardian_id` = NEW.`guardian_id`
    AND `id` <> OLD.`id`
)
BEGIN SELECT RAISE(ABORT, 'student guardian link already exists'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_guardian_primary_guard`
BEFORE INSERT ON `student_guardian_links`
WHEN NEW.`is_primary` = 1 AND EXISTS (
  SELECT 1 FROM `student_guardian_links`
  WHERE `organization_id` = NEW.`organization_id` AND `student_id` = NEW.`student_id` AND `is_primary` = 1
)
BEGIN SELECT RAISE(ABORT, 'student already has a primary guardian'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_guardian_primary_update_guard`
BEFORE UPDATE ON `student_guardian_links`
WHEN NEW.`is_primary` = 1 AND EXISTS (
  SELECT 1 FROM `student_guardian_links`
  WHERE `organization_id` = NEW.`organization_id` AND `student_id` = NEW.`student_id` AND `is_primary` = 1 AND `id` <> OLD.`id`
)
BEGIN SELECT RAISE(ABORT, 'student already has a primary guardian'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `student_certificates_immutable_guard`
BEFORE UPDATE ON `student_certificates`
WHEN NEW.`organization_id` <> OLD.`organization_id`
  OR NEW.`student_id` <> OLD.`student_id`
  OR COALESCE(NEW.`template_id`, '') <> COALESCE(OLD.`template_id`, '')
  OR NEW.`certificate_number` <> OLD.`certificate_number`
  OR NEW.`certificate_type` <> OLD.`certificate_type`
  OR NEW.`verification_code` <> OLD.`verification_code`
  OR NEW.`issued_at` <> OLD.`issued_at`
  OR NEW.`issued_by` <> OLD.`issued_by`
  OR NEW.`snapshot_json` <> OLD.`snapshot_json`
BEGIN SELECT RAISE(ABORT, 'issued certificate fields are immutable'); END;
