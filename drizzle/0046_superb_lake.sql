CREATE TABLE IF NOT EXISTS `document_types` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'identity' NOT NULL,
	`requirement_type` text DEFAULT 'required' NOT NULL,
	`applies_to` text DEFAULT 'student' NOT NULL,
	`condition_expression` text,
	`allowed_file_types` text DEFAULT 'pdf,jpg,jpeg,png,webp' NOT NULL,
	`max_file_size_bytes` integer DEFAULT 15728640 NOT NULL,
	`requires_verification` integer DEFAULT true NOT NULL,
	`expiry_enabled` integer DEFAULT false NOT NULL,
	`expiry_notification_days` text DEFAULT '30,7,1',
	`is_sensitive` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `doc_types_org_code_idx` ON `document_types` (`organization_id`,`code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `doc_types_org_status_idx` ON `document_types` (`organization_id`,`status`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `student_document_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`document_type_id` text NOT NULL,
	`academic_year_id` text,
	`class_id` text,
	`requirement_type` text DEFAULT 'required' NOT NULL,
	`condition_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `doc_req_org_type_idx` ON `student_document_requirements` (`organization_id`,`document_type_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `doc_req_org_year_idx` ON `student_document_requirements` (`organization_id`,`academic_year_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `student_document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_document_id` text NOT NULL,
	`version_number` integer DEFAULT 1 NOT NULL,
	`storage_key` text NOT NULL,
	`storage_provider` text DEFAULT 'private_disk' NOT NULL,
	`original_filename` text NOT NULL,
	`sanitized_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_extension` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`file_hash` text NOT NULL,
	`is_optimized` integer DEFAULT false NOT NULL,
	`optimized_storage_key` text,
	`optimized_size_bytes` integer,
	`scan_status` text DEFAULT 'clean' NOT NULL,
	`scanned_at` integer,
	`scanner` text DEFAULT 'heuristic_clamav_ready',
	`scanner_version` text DEFAULT '1.0.0',
	`scan_result` text DEFAULT 'clean',
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`change_reason` text,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `doc_ver_student_doc_idx` ON `student_document_versions` (`student_document_id`,`version_number`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `doc_ver_hash_idx` ON `student_document_versions` (`file_hash`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `student_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`campus_id` text,
	`student_id` text NOT NULL,
	`guardian_id` text,
	`document_type_id` text NOT NULL,
	`current_version_id` text,
	`status` text DEFAULT 'missing' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verified_by` text,
	`verified_at` integer,
	`rejection_reason` text,
	`verification_notes` text,
	`issued_at` integer,
	`expires_at` integer,
	`expiry_status` text DEFAULT 'valid',
	`is_sensitive` integer DEFAULT false NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	`deletion_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_docs_org_student_idx` ON `student_documents` (`organization_id`,`student_id`,`deleted_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_docs_type_idx` ON `student_documents` (`student_id`,`document_type_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_docs_expires_idx` ON `student_documents` (`expires_at`,`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `student_docs_verification_idx` ON `student_documents` (`organization_id`,`verification_status`);