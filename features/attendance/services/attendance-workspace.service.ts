import { and, count, desc, eq, gte, inArray, lt, sql, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicYears,
  attendanceCorrectionRequests,
  classes,
  sections,
  studentAttendanceRecords,
  students,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { AppError } from "@/lib/errors/app-error";
import { normalizePagination } from "@/lib/utils/pagination";
import { formatIndiaDateTime, indiaDateKey, indiaDayRange, normalizeIndiaCalendarDate, parseIndiaDateInput } from "@/lib/utils/india-time";
import {
  getReadableStudent,
  listStudents,
  resolvePermittedStudentIds,
} from "@/features/students/services/students.service";

function campusScope(user: CurrentUser, column: AnyColumn) {
  if (user.campusIds?.length) return inArray(column, user.campusIds);
  if (user.campusId) return eq(column, user.campusId);
  return hasPermission(user, "organizations:update") ? undefined : eq(column, "__no_campus__");
}

export async function getAttendanceStudentOptions(user: CurrentUser, search?: string) {
  const rows = await listStudents(user, search, true);
  return rows.map((row) => ({ id: row.id, name: row.name, label: row.name, detail: row.detail }));
}

export async function listAttendancePage(
  user: CurrentUser,
  input?: { page?: number; pageSize?: number; date?: string },
) {
  const pagination = normalizePagination(input);
  let attendanceDate: Date;
  try {
    attendanceDate = input?.date ? parseIndiaDateInput(input.date) : normalizeIndiaCalendarDate(new Date());
  } catch {
    throw new AppError("VALIDATION_ERROR", "Attendance date must use the YYYY-MM-DD format.", 422);
  }
  const day = indiaDayRange(attendanceDate);
  const attendanceDateKey = indiaDateKey(attendanceDate);
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) {
    return { rows: [], pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total: 0, pageCount: 0 }, attendanceDate: attendanceDateKey };
  }
  const where = and(
    eq(studentAttendanceRecords.organizationId, user.organizationId),
    campusScope(user, studentAttendanceRecords.campusId),
    gte(studentAttendanceRecords.attendanceDate, day.start),
    lt(studentAttendanceRecords.attendanceDate, day.end),
    permittedIds ? inArray(studentAttendanceRecords.studentId, permittedIds) : undefined,
  );
  const [rows, totals] = await Promise.all([
    getDb().select({
      id: studentAttendanceRecords.id,
      studentId: studentAttendanceRecords.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      state: studentAttendanceRecords.state,
      period: studentAttendanceRecords.periodKey,
      markedAt: studentAttendanceRecords.updatedAt,
    }).from(studentAttendanceRecords)
      .innerJoin(students, and(
        eq(students.id, studentAttendanceRecords.studentId),
        eq(students.organizationId, user.organizationId),
      ))
      .where(where)
      .orderBy(desc(studentAttendanceRecords.updatedAt))
      .limit(pagination.pageSize)
      .offset(pagination.offset),
    getDb().select({ value: count() }).from(studentAttendanceRecords).where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    rows: rows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      student: `${row.firstName} ${row.lastName}`,
      state: row.state,
      period: row.period,
      markedAt: formatIndiaDateTime(row.markedAt),
    })),
    pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total, pageCount: Math.ceil(total / pagination.pageSize) },
    attendanceDate: attendanceDateKey,
  };
}

export async function getAttendanceOverview(user: CurrentUser) {
  const activeYearRows = await getDb().select({ id: academicYears.id }).from(academicYears).where(and(
    eq(academicYears.organizationId, user.organizationId),
    eq(academicYears.status, "active"),
    eq(academicYears.isActive, true),
    campusScope(user, academicYears.campusId),
  ));
  const permittedIds = await resolvePermittedStudentIds(user);
  const activeYearIds = activeYearRows.map((row) => row.id);
  if (!activeYearIds.length || permittedIds?.length === 0) return { total: 0, attended: 0, rate: 0, states: [], groups: [] };
  const where = and(
    eq(studentAttendanceRecords.organizationId, user.organizationId),
    eq(studentAttendanceRecords.status, "active"),
    inArray(studentAttendanceRecords.academicYearId, activeYearIds),
    campusScope(user, studentAttendanceRecords.campusId),
    permittedIds ? inArray(studentAttendanceRecords.studentId, permittedIds) : undefined,
  );
  const [stateRows, groupRows] = await Promise.all([
    getDb().select({ state: studentAttendanceRecords.state, total: count() }).from(studentAttendanceRecords).where(where).groupBy(studentAttendanceRecords.state),
    getDb().select({ classId: classes.id, className: classes.name, sectionId: sections.id, sectionName: sections.name, total: count(studentAttendanceRecords.id), attended: sql<number>`sum(case when ${studentAttendanceRecords.state} in ('present', 'late') then 1 else 0 end)` }).from(studentAttendanceRecords)
      .innerJoin(classes, and(eq(classes.id, studentAttendanceRecords.classId), eq(classes.organizationId, user.organizationId)))
      .innerJoin(sections, and(eq(sections.id, studentAttendanceRecords.sectionId), eq(sections.organizationId, user.organizationId)))
      .where(where).groupBy(classes.id, classes.name, sections.id, sections.name).orderBy(classes.name, sections.name),
  ]);
  const states = stateRows.map((row) => ({ state: row.state, total: Number(row.total) }));
  const total = states.reduce((sum, row) => sum + row.total, 0);
  const attended = states.filter((row) => row.state === "present" || row.state === "late").reduce((sum, row) => sum + row.total, 0);
  return {
    total,
    attended,
    rate: total ? Number(((attended / total) * 100).toFixed(1)) : 0,
    states,
    groups: groupRows.map((row) => {
      const totalRows = Number(row.total);
      const attendedRows = Number(row.attended ?? 0);
      return { ...row, total: totalRows, attended: attendedRows, rate: totalRows ? Number(((attendedRows / totalRows) * 100).toFixed(1)) : 0 };
    }),
  };
}

export async function listStudentAttendance(
  user: CurrentUser,
  studentId: string,
  input?: { page?: number; pageSize?: number },
) {
  const student = await getReadableStudent(user, studentId);
  const pagination = normalizePagination(input);
  const where = and(
    eq(studentAttendanceRecords.organizationId, user.organizationId),
    eq(studentAttendanceRecords.studentId, student.id),
    student.campusId
      ? eq(studentAttendanceRecords.campusId, student.campusId)
      : undefined,
  );
  const [rows, totals] = await Promise.all([
    getDb()
      .select({
        id: studentAttendanceRecords.id,
        attendanceDate: studentAttendanceRecords.attendanceDate,
        period: studentAttendanceRecords.periodKey,
        state: studentAttendanceRecords.state,
        note: studentAttendanceRecords.note,
        updatedAt: studentAttendanceRecords.updatedAt,
        status: studentAttendanceRecords.status,
      })
      .from(studentAttendanceRecords)
      .where(where)
      .orderBy(
        desc(studentAttendanceRecords.attendanceDate),
        desc(studentAttendanceRecords.updatedAt),
      )
      .limit(pagination.pageSize)
      .offset(pagination.offset),
    getDb()
      .select({ value: count() })
      .from(studentAttendanceRecords)
      .where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    rows: rows.map((row) => ({
      ...row,
      attendanceDate: row.attendanceDate.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    pageInfo: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pageCount: Math.ceil(total / pagination.pageSize),
    },
  };
}

export async function listAttendanceCorrections(user: CurrentUser) {
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) return [];
  const rows = await getDb().select({
    id: attendanceCorrectionRequests.id,
    firstName: students.firstName,
    lastName: students.lastName,
    currentState: studentAttendanceRecords.state,
    requestedState: attendanceCorrectionRequests.requestedState,
    reason: attendanceCorrectionRequests.reason,
    status: attendanceCorrectionRequests.status,
  }).from(attendanceCorrectionRequests)
    .innerJoin(studentAttendanceRecords, and(
      eq(studentAttendanceRecords.id, attendanceCorrectionRequests.attendanceId),
      eq(studentAttendanceRecords.organizationId, user.organizationId),
    ))
    .innerJoin(students, and(
      eq(students.id, studentAttendanceRecords.studentId),
      eq(students.organizationId, user.organizationId),
    ))
    .where(and(
      eq(attendanceCorrectionRequests.organizationId, user.organizationId),
      campusScope(user, attendanceCorrectionRequests.campusId),
      eq(attendanceCorrectionRequests.status, "pending"),
      permittedIds ? inArray(studentAttendanceRecords.studentId, permittedIds) : undefined,
    ))
    .orderBy(desc(attendanceCorrectionRequests.createdAt))
    .limit(100);
  return rows.map((row) => ({ ...row, student: `${row.firstName} ${row.lastName}` }));
}
