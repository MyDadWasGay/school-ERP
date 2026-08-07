import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

export const studentAttendanceSessions = sqliteTable("student_attendance_sessions", {
  id: idColumn("attendance_session"), ...tenantColumns(), academicYearId: text("academic_year_id").notNull(), classId: text("class_id").notNull(), sectionId: text("section_id").notNull(), attendanceDate: integer("attendance_date", { mode: "timestamp" }).notNull(), periodKey: text("period_key").notNull().default("daily"), openedBy: text("opened_by").notNull(), closedAt: integer("closed_at", { mode: "timestamp" }), ...auditColumns(), status: statusColumn("open"),
}, (table) => [uniqueIndex("attendance_session_unique").on(table.organizationId, table.classId, table.sectionId, table.attendanceDate, table.periodKey), index("attendance_sessions_scope_idx").on(table.organizationId, table.campusId, table.attendanceDate)]);

export const studentAttendanceRecords = sqliteTable("student_attendance_records", {
  id: idColumn("attendance"), ...tenantColumns(), sessionId: text("session_id"), studentId: text("student_id").notNull(), academicYearId: text("academic_year_id").notNull(), classId: text("class_id").notNull(), sectionId: text("section_id").notNull(), attendanceDate: integer("attendance_date", { mode: "timestamp" }).notNull(), periodKey: text("period_key").notNull().default("daily"), state: text("state").notNull(), note: text("note"), markedBy: text("marked_by").notNull(), ...auditColumns(), status: statusColumn(),
}, (table) => [uniqueIndex("attendance_student_day_unique").on(table.studentId, table.attendanceDate, table.periodKey), index("attendance_scope_idx").on(table.organizationId, table.classId, table.sectionId, table.attendanceDate)]);

export const attendanceCorrectionRequests = sqliteTable("attendance_correction_requests", {
  id: idColumn("attendance_correction"), ...tenantColumns(), attendanceId: text("attendance_id").notNull(), requestedState: text("requested_state").notNull(), reason: text("reason").notNull(), requestedBy: text("requested_by").notNull(), reviewedBy: text("reviewed_by"), reviewedAt: integer("reviewed_at", { mode: "timestamp" }), ...auditColumns(), status: statusColumn("pending"),
}, (table) => [index("attendance_corrections_org_idx").on(table.organizationId, table.status)]);

export const leaveRequests = sqliteTable("leave_requests", {
  id: idColumn("leave"), ...tenantColumns(), requesterType: text("requester_type").notNull(), requesterId: text("requester_id").notNull(), startsOn: integer("starts_on", { mode: "timestamp" }).notNull(), endsOn: integer("ends_on", { mode: "timestamp" }).notNull(), reason: text("reason").notNull(), reviewedBy: text("reviewed_by"), reviewedAt: integer("reviewed_at", { mode: "timestamp" }), ...auditColumns(), status: statusColumn("pending"),
}, (table) => [index("leave_requests_scope_idx").on(table.organizationId, table.requesterType, table.requesterId, table.status)]);

export const disciplineIncidents = sqliteTable("discipline_incidents", {
  id: idColumn("incident"), ...tenantColumns(), studentId: text("student_id").notNull(), severity: text("severity").notNull(), title: text("title").notNull(), details: text("details"), confidential: integer("confidential", { mode: "boolean" }).notNull().default(false), occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(), ...auditColumns(), status: statusColumn("open"),
}, (table) => [index("discipline_student_idx").on(table.organizationId, table.studentId, table.status)]);
