import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";
export const admissionsEnquiries = sqliteTable("admissions_enquiries", { id: idColumn("enquiry"), ...tenantColumns(), applicantName: text("applicant_name").notNull(), guardianName: text("guardian_name"), guardianEmail: text("guardian_email"), guardianPhone: text("guardian_phone"), notes: text("notes"), source: text("source"), campaign: text("campaign"), nextFollowUpAt: integer("next_follow_up_at", { mode: "timestamp" }), lostReason: text("lost_reason"), ...auditColumns(), status: statusColumn("new") }, (table) => [index("enquiries_org_status_idx").on(table.organizationId, table.status)]);
export const applications = sqliteTable("applications", {
  id: idColumn("application"), ...tenantColumns(), applicationNumber: text("application_number").notNull(),
  applicantName: text("applicant_name").notNull(), dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),
  gender: text("gender"), guardianJson: text("guardian_json"), academicYearId: text("academic_year_id"),
  appliedClassId: text("applied_class_id"), appliedSectionId: text("applied_section_id"),
  sourceEnquiryId: text("source_enquiry_id"), decisionReason: text("decision_reason"),
  ...auditColumns(), status: statusColumn("submitted"),
}, (table) => [
  index("applications_org_status_idx").on(table.organizationId, table.status),
  uniqueIndex("applications_org_number_unique").on(table.organizationId, table.applicationNumber),
]);

export const admissionFollowUps = sqliteTable("admission_follow_ups", {
  id: idColumn("admission_follow_up"), ...tenantColumns(), enquiryId: text("enquiry_id").notNull(), assignedTo: text("assigned_to"), dueAt: integer("due_at", { mode: "timestamp" }).notNull(), completedAt: integer("completed_at", { mode: "timestamp" }), note: text("note").notNull(), outcome: text("outcome"), ...auditColumns(), status: statusColumn("open"),
}, (table) => [index("admission_followups_scope_idx").on(table.organizationId, table.campusId, table.status, table.dueAt), index("admission_followups_enquiry_idx").on(table.organizationId, table.enquiryId)]);

export const admissionAssessments = sqliteTable("admission_assessments", {
  id: idColumn("admission_assessment"), ...tenantColumns(), applicationId: text("application_id").notNull(), assessmentType: text("assessment_type").notNull(), scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(), score: integer("score"), outcome: text("outcome"), notes: text("notes"), assessedBy: text("assessed_by"), ...auditColumns(), status: statusColumn("scheduled"),
}, (table) => [index("admission_assessments_application_idx").on(table.organizationId, table.applicationId, table.status), index("admission_assessments_schedule_idx").on(table.organizationId, table.scheduledAt)]);
