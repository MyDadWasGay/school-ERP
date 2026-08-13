import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

export const guardians = sqliteTable("guardians", {
  id: idColumn("guardian"), ...tenantColumns(), firstName: text("first_name").notNull(), lastName: text("last_name").notNull(), email: text("email"), phone: text("phone"), occupation: text("occupation"), addressJson: text("address_json"), custodyNotes: text("custody_notes"), ...auditColumns(), status: statusColumn(),
}, (table) => [index("guardians_org_idx").on(table.organizationId)]);

export const students = sqliteTable("students", {
  id: idColumn("student"), ...tenantColumns(), admissionNumber: text("admission_number").notNull(), firstName: text("first_name").notNull(), lastName: text("last_name").notNull(), dateOfBirth: integer("date_of_birth", { mode: "timestamp" }), gender: text("gender"), email: text("email"), phone: text("phone"), addressJson: text("address_json"), photoUrl: text("photo_url"), houseId: text("house_id"), bloodGroup: text("blood_group"), joinedOn: integer("joined_on", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()), ...auditColumns(), status: statusColumn(),
}, (table) => [index("students_org_idx").on(table.organizationId), index("students_campus_idx").on(table.organizationId, table.campusId), uniqueIndex("students_admission_unique").on(table.organizationId, table.admissionNumber)]);

export const studentGuardianLinks = sqliteTable("student_guardian_links", {
  id: idColumn("student_guardian"), ...tenantColumns(), studentId: text("student_id").notNull(), guardianId: text("guardian_id").notNull(), relationship: text("relationship").notNull(), customRelationship: text("custom_relationship"), isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false), isEmergencyContact: integer("is_emergency_contact", { mode: "boolean" }).notNull().default(false), isBillingContact: integer("is_billing_contact", { mode: "boolean" }).notNull().default(false), ...auditColumns(),
}, (table) => [index("student_guardians_student_idx").on(table.organizationId, table.studentId), uniqueIndex("student_guardian_link_unique").on(table.organizationId, table.studentId, table.guardianId)]);

export const enrollments = sqliteTable("enrollments", {
  id: idColumn("enrollment"), ...tenantColumns(), studentId: text("student_id").notNull(), academicYearId: text("academic_year_id").notNull(), classId: text("class_id").notNull(), sectionId: text("section_id").notNull(), rollNumber: text("roll_number"), startsOn: integer("starts_on", { mode: "timestamp" }).notNull(), endsOn: integer("ends_on", { mode: "timestamp" }), ...auditColumns(), status: statusColumn(),
}, (table) => [index("enrollments_student_idx").on(table.organizationId, table.studentId), index("enrollments_class_idx").on(table.organizationId, table.classId, table.sectionId)]);

export const documentFiles = sqliteTable("document_files", {
  id: idColumn("document"), ...tenantColumns(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), category: text("category").notNull(), cloudinaryPublicId: text("cloudinary_public_id").notNull(), secureUrl: text("secure_url").notNull(), resourceType: text("resource_type").notNull(), format: text("format"), bytes: integer("bytes"), width: integer("width"), height: integer("height"), version: integer("version"), originalFilename: text("original_filename"), expiresAt: integer("expires_at", { mode: "timestamp" }), accessPolicy: text("access_policy").notNull().default("private"), uploadedBy: text("uploaded_by").notNull(), ...auditColumns(), status: statusColumn(),
}, (table) => [index("documents_entity_idx").on(table.organizationId, table.entityType, table.entityId)]);

export const studentMedicalProfiles = sqliteTable("student_medical_profiles", {
  id: idColumn("student_medical"), ...tenantColumns(), studentId: text("student_id").notNull(), allergies: text("allergies"), conditions: text("conditions"), medications: text("medications"), emergencyNotes: text("emergency_notes"), ...auditColumns(), status: statusColumn(),
}, (table) => [uniqueIndex("student_medical_student_unique").on(table.studentId), index("student_medical_org_idx").on(table.organizationId)]);

export const studentTimelineEvents = sqliteTable("student_timeline_events", {
  id: idColumn("timeline"), ...tenantColumns(), studentId: text("student_id").notNull(), eventType: text("event_type").notNull(), title: text("title").notNull(), detailsJson: text("details_json"), occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(), ...auditColumns(), status: statusColumn(),
}, (table) => [index("student_timeline_idx").on(table.organizationId, table.studentId, table.occurredAt)]);

export const certificateTemplates = sqliteTable("certificate_templates", {
  id: idColumn("certificate_template"), ...tenantColumns(), certificateType: text("certificate_type").notNull(), name: text("name").notNull(), bodyTemplate: text("body_template").notNull(), ...auditColumns(), status: statusColumn("draft"),
}, (table) => [index("certificate_templates_org_idx").on(table.organizationId, table.certificateType)]);

export const studentCertificates = sqliteTable("student_certificates", {
  id: idColumn("certificate"), ...tenantColumns(), studentId: text("student_id").notNull(), templateId: text("template_id"), certificateNumber: text("certificate_number").notNull(), certificateType: text("certificate_type").notNull(), verificationCode: text("verification_code").notNull(), issuedAt: integer("issued_at", { mode: "timestamp" }).notNull(), issuedBy: text("issued_by").notNull(), snapshotJson: text("snapshot_json").notNull(), originalCertificateId: text("original_certificate_id"), ...auditColumns(), status: statusColumn("issued"),
}, (table) => [uniqueIndex("certificates_org_number_unique").on(table.organizationId, table.certificateNumber), uniqueIndex("certificates_verification_unique").on(table.verificationCode), index("certificates_student_idx").on(table.organizationId, table.studentId)]);
