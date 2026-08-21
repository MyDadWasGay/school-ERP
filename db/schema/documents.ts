import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

/**
 * Configurable Document Types (e.g. Birth Certificate, Aadhaar, Caste Certificate, etc.)
 */
export const documentTypes = sqliteTable(
  "document_types",
  {
    id: idColumn("doc_type"),
    ...tenantColumns(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull().default("identity"), // identity, academic, legal, financial, medical, photograph, address, consent, other
    requirementType: text("requirement_type").notNull().default("required"), // required, conditional, optional
    appliesTo: text("applies_to").notNull().default("student"), // student, guardian, employee, all
    conditionExpression: text("condition_expression"), // JSON string rule for conditional logic
    allowedFileTypes: text("allowed_file_types").notNull().default("pdf,jpg,jpeg,png,webp"),
    maxFileSizeBytes: integer("max_file_size_bytes").notNull().default(15728640), // 15 MB default
    requiresVerification: integer("requires_verification", { mode: "boolean" }).notNull().default(true),
    expiryEnabled: integer("expiry_enabled", { mode: "boolean" }).notNull().default(false),
    expiryNotificationDays: text("expiry_notification_days").default("30,7,1"),
    isSensitive: integer("is_sensitive", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...auditColumns(),
    status: statusColumn("active"),
  },
  (table) => [
    index("doc_types_org_code_idx").on(table.organizationId, table.code),
    index("doc_types_org_status_idx").on(table.organizationId, table.status),
  ],
);

/**
 * Specific Document Requirements configured per Academic Year or Class
 */
export const studentDocumentRequirements = sqliteTable(
  "student_document_requirements",
  {
    id: idColumn("doc_req"),
    ...tenantColumns(),
    documentTypeId: text("document_type_id").notNull(),
    academicYearId: text("academic_year_id"),
    classId: text("class_id"),
    requirementType: text("requirement_type").notNull().default("required"), // required, conditional, optional
    conditionJson: text("condition_json"),
    ...auditColumns(),
    status: statusColumn("active"),
  },
  (table) => [
    index("doc_req_org_type_idx").on(table.organizationId, table.documentTypeId),
    index("doc_req_org_year_idx").on(table.organizationId, table.academicYearId),
  ],
);

/**
 * Student Document Master Record
 */
export const studentDocuments = sqliteTable(
  "student_documents",
  {
    id: idColumn("student_doc"),
    ...tenantColumns(),
    studentId: text("student_id").notNull(),
    guardianId: text("guardian_id"), // if parent/guardian document
    documentTypeId: text("document_type_id").notNull(),
    currentVersionId: text("current_version_id"),
    status: text("status").notNull().default("missing"), // missing, uploaded, processing, pending_verification, verified, rejected, expired, superseded, deleted
    verificationStatus: text("verification_status").notNull().default("pending"), // pending, verified, rejected, unverified
    verifiedBy: text("verified_by"),
    verifiedAt: integer("verified_at", { mode: "timestamp" }),
    rejectionReason: text("rejection_reason"),
    verificationNotes: text("verification_notes"),
    issuedAt: integer("issued_at", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    expiryStatus: text("expiry_status").default("valid"), // valid, expiring_soon, expired, not_applicable
    isSensitive: integer("is_sensitive", { mode: "boolean" }).notNull().default(false),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    deletedBy: text("deleted_by"),
    deletionReason: text("deletion_reason"),
    ...auditColumns(),
  },
  (table) => [
    index("student_docs_org_student_idx").on(table.organizationId, table.studentId, table.deletedAt),
    index("student_docs_type_idx").on(table.studentId, table.documentTypeId),
    index("student_docs_expires_idx").on(table.expiresAt, table.status),
    index("student_docs_verification_idx").on(table.organizationId, table.verificationStatus),
  ],
);

/**
 * Student Document Version History
 */
export const studentDocumentVersions = sqliteTable(
  "student_document_versions",
  {
    id: idColumn("doc_ver"),
    ...tenantColumns(),
    studentDocumentId: text("student_document_id").notNull(),
    versionNumber: integer("version_number").notNull().default(1),
    storageKey: text("storage_key").notNull(),
    storageProvider: text("storage_provider").notNull().default("private_disk"), // private_disk, s3, cloudinary
    originalFilename: text("original_filename").notNull(),
    sanitizedFilename: text("sanitized_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileExtension: text("file_extension").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    fileHash: text("file_hash").notNull(), // SHA-256
    isOptimized: integer("is_optimized", { mode: "boolean" }).notNull().default(false),
    optimizedStorageKey: text("optimized_storage_key"),
    optimizedSizeBytes: integer("optimized_size_bytes"),
    scanStatus: text("scan_status").notNull().default("clean"), // pending, scanning, clean, infected, scan_failed
    scannedAt: integer("scanned_at", { mode: "timestamp" }),
    scanner: text("scanner").default("heuristic_clamav_ready"),
    scannerVersion: text("scanner_version").default("1.0.0"),
    scanResult: text("scan_result").default("clean"),
    verificationStatus: text("verification_status").notNull().default("pending"), // pending, verified, rejected
    changeReason: text("change_reason"),
    uploadedBy: text("uploaded_by").notNull(),
    ...auditColumns(),
    status: statusColumn("active"), // active, superseded, deleted
  },
  (table) => [
    index("doc_ver_student_doc_idx").on(table.studentDocumentId, table.versionNumber),
    index("doc_ver_hash_idx").on(table.fileHash),
  ],
);
