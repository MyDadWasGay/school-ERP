import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { employees, staffAttendanceRecords, studentAttendanceRecords, students } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { StaffAttendanceInput } from "../schemas/attendance-extension.schema";

export async function listStaffAttendance(user: CurrentUser) {
  const rows = await getDb().select().from(staffAttendanceRecords).where(and(eq(staffAttendanceRecords.organizationId, user.organizationId), user.campusId ? eq(staffAttendanceRecords.campusId, user.campusId) : undefined, eq(staffAttendanceRecords.status, "active"))).orderBy(desc(staffAttendanceRecords.effectiveAt), asc(staffAttendanceRecords.name)).limit(500);
  return rows.map((row) => { let details: Record<string, unknown> = {}; try { details = row.detailsJson ? JSON.parse(row.detailsJson) as Record<string, unknown> : {}; } catch { /* retain safe empty details */ } return { ...row, employeeId: row.referenceId, state: typeof details.state === "string" ? details.state : "unknown", note: typeof details.note === "string" ? details.note : null }; });
}

export async function listEmployeeOptions(user: CurrentUser) {
  return getDb().select({ id: employees.id, name: sql<string>`${employees.employeeNumber} || ' · ' || ${employees.firstName} || ' ' || ${employees.lastName}` }).from(employees).where(and(eq(employees.organizationId, user.organizationId), user.campusId ? eq(employees.campusId, user.campusId) : undefined, eq(employees.status, "active"))).orderBy(asc(employees.employeeNumber)).limit(500);
}

export async function recordStaffAttendance(user: CurrentUser, input: StaffAttendanceInput) {
  const employee = await getDb().query.employees.findFirst({ where: and(eq(employees.id, input.employeeId), eq(employees.organizationId, user.organizationId), user.campusId ? eq(employees.campusId, user.campusId) : undefined, eq(employees.status, "active")) });
  if (!employee) throw new AppError("NOT_FOUND", "Employee is outside your campus scope.", 404);
  const date = new Date(input.attendanceDate); date.setHours(0, 0, 0, 0);
  const existing = await getDb().query.staffAttendanceRecords.findFirst({ where: and(eq(staffAttendanceRecords.organizationId, user.organizationId), eq(staffAttendanceRecords.referenceId, employee.id), eq(staffAttendanceRecords.effectiveAt, date), eq(staffAttendanceRecords.status, "active")) });
  if (existing) throw new AppError("CONFLICT", "Attendance for this employee and date already exists.", 409);
  const [row] = await getDb().insert(staffAttendanceRecords).values({ id: createId("staff_attendance"), organizationId: user.organizationId, campusId: employee.campusId, name: `${employee.employeeNumber} · ${employee.firstName} ${employee.lastName}`, referenceId: employee.id, effectiveAt: date, detailsJson: JSON.stringify({ employeeId: employee.id, state: input.state, note: input.note }), status: "active", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to record staff attendance.", 500);
  return row;
}

export async function listLowAttendance(user: CurrentUser, thresholdPercent = 75) {
  const rows = await getDb().select({ studentId: students.id, student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`, total: count(studentAttendanceRecords.id), attended: sql<number>`sum(case when ${studentAttendanceRecords.state} in ('present', 'late') then 1 else 0 end)` }).from(students).leftJoin(studentAttendanceRecords, and(eq(studentAttendanceRecords.studentId, students.id), eq(studentAttendanceRecords.organizationId, user.organizationId))).where(and(eq(students.organizationId, user.organizationId), user.campusId ? eq(students.campusId, user.campusId) : undefined, eq(students.status, "active"))).groupBy(students.id, students.firstName, students.lastName).orderBy(asc(students.firstName)).limit(500);
  return rows.map((row) => { const total = Number(row.total); const attended = Number(row.attended ?? 0); const percentage = total ? Number(((attended / total) * 100).toFixed(1)) : 100; return { ...row, total, attended, percentage }; }).filter((row) => row.total > 0 && row.percentage < thresholdPercent);
}
