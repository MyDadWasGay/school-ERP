import { and, asc, count, desc, eq, inArray, sql, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import { academicYears, employees, staffAttendanceRecords, studentAttendanceRecords, students } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { createId } from "@/lib/utils/ids";
import { normalizeIndiaCalendarDate } from "@/lib/utils/india-time";
import { resolvePermittedStudentIds } from "@/features/students/services/students.service";
import type { StaffAttendanceInput } from "../schemas/attendance-extension.schema";

function campusScope(user: CurrentUser, column: AnyColumn) {
  if (user.campusIds?.length) return inArray(column, user.campusIds);
  if (user.campusId) return eq(column, user.campusId);
  return hasPermission(user, "organizations:update") ? undefined : eq(column, "__no_campus__");
}

export async function listStaffAttendance(user: CurrentUser) {
  const rows = await getDb().select().from(staffAttendanceRecords).where(and(
    eq(staffAttendanceRecords.organizationId, user.organizationId),
    campusScope(user, staffAttendanceRecords.campusId),
    eq(staffAttendanceRecords.status, "active"),
  )).orderBy(desc(staffAttendanceRecords.effectiveAt), asc(staffAttendanceRecords.name)).limit(500);
  return rows.map((row) => {
    let details: Record<string, unknown> = {};
    try { details = row.detailsJson ? JSON.parse(row.detailsJson) as Record<string, unknown> : {}; } catch { /* retain safe empty details */ }
    return { ...row, employeeId: row.referenceId, state: typeof details.state === "string" ? details.state : "unknown", note: typeof details.note === "string" ? details.note : null };
  });
}

export async function listEmployeeOptions(user: CurrentUser) {
  return getDb().select({
    id: employees.id,
    name: sql<string>`${employees.employeeNumber} || ' · ' || ${employees.firstName} || ' ' || ${employees.lastName}`,
  }).from(employees).where(and(
    eq(employees.organizationId, user.organizationId),
    campusScope(user, employees.campusId),
    eq(employees.status, "active"),
  )).orderBy(asc(employees.employeeNumber)).limit(500);
}

export async function recordStaffAttendance(user: CurrentUser, input: StaffAttendanceInput) {
  const employee = await getDb().query.employees.findFirst({ where: and(
    eq(employees.id, input.employeeId),
    eq(employees.organizationId, user.organizationId),
    campusScope(user, employees.campusId),
    eq(employees.status, "active"),
  ) });
  if (!employee) throw new AppError("NOT_FOUND", "Employee is outside your campus scope.", 404);
  const date = normalizeIndiaCalendarDate(input.attendanceDate);
  const existing = await getDb().query.staffAttendanceRecords.findFirst({ where: and(
    eq(staffAttendanceRecords.organizationId, user.organizationId),
    eq(staffAttendanceRecords.referenceId, employee.id),
    eq(staffAttendanceRecords.effectiveAt, date),
    eq(staffAttendanceRecords.status, "active"),
  ) });
  if (existing) throw new AppError("CONFLICT", "Attendance for this employee and date already exists.", 409);
  const [row] = await getDb().insert(staffAttendanceRecords).values({
    id: createId("staff_attendance"), organizationId: user.organizationId, campusId: employee.campusId,
    name: `${employee.employeeNumber} · ${employee.firstName} ${employee.lastName}`, referenceId: employee.id,
    effectiveAt: date, detailsJson: JSON.stringify({ employeeId: employee.id, state: input.state, note: input.note }),
    status: "active", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to record staff attendance.", 500);
  return row;
}

export async function listLowAttendance(user: CurrentUser, thresholdPercent = 75) {
  const threshold = Math.min(100, Math.max(0, Number.isFinite(thresholdPercent) ? thresholdPercent : 75));
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) return [];
  const yearRows = await getDb().select({ id: academicYears.id }).from(academicYears).where(and(
    eq(academicYears.organizationId, user.organizationId),
    eq(academicYears.status, "active"),
    eq(academicYears.isActive, true),
    campusScope(user, academicYears.campusId),
  ));
  if (!yearRows.length) return [];
  const rows = await getDb().select({
    studentId: students.id,
    student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
    total: count(studentAttendanceRecords.id),
    attended: sql<number>`sum(case when ${studentAttendanceRecords.state} in ('present', 'late') then 1 else 0 end)`,
  }).from(students).leftJoin(studentAttendanceRecords, and(
    eq(studentAttendanceRecords.studentId, students.id),
    eq(studentAttendanceRecords.organizationId, user.organizationId),
    eq(studentAttendanceRecords.status, "active"),
    inArray(studentAttendanceRecords.academicYearId, yearRows.map((row) => row.id)),
  )).where(and(
    eq(students.organizationId, user.organizationId),
    campusScope(user, students.campusId),
    eq(students.status, "active"),
    permittedIds ? inArray(students.id, permittedIds) : undefined,
  )).groupBy(students.id, students.firstName, students.lastName).orderBy(asc(students.firstName)).limit(500);
  return rows.map((row) => {
    const total = Number(row.total);
    const attended = Number(row.attended ?? 0);
    const percentage = total ? Number(((attended / total) * 100).toFixed(1)) : 100;
    return { ...row, total, attended, percentage };
  }).filter((row) => row.total > 0 && row.percentage < threshold);
}
