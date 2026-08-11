import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  attendanceCorrectionRequests,
  studentAttendanceRecords,
  students,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { normalizePagination } from "@/lib/utils/pagination";
import {
  getReadableStudent,
  listStudents,
  resolvePermittedStudentIds,
} from "@/features/students/services/students.service";

export async function getAttendanceStudentOptions(user: CurrentUser) {
  const rows = await listStudents(user);
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

export async function listAttendancePage(
  user: CurrentUser,
  input?: { page?: number; pageSize?: number; date?: string },
) {
  const pagination = normalizePagination(input);
  const attendanceDate = input?.date ? new Date(`${input.date}T00:00:00`) : new Date();
  attendanceDate.setHours(0, 0, 0, 0);
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && permittedIds.length === 0) {
    return { rows: [], pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total: 0, pageCount: 0 }, attendanceDate };
  }
  const where = and(
    eq(studentAttendanceRecords.organizationId, user.organizationId),
    user.campusId ? eq(studentAttendanceRecords.campusId, user.campusId) : undefined,
    eq(studentAttendanceRecords.attendanceDate, attendanceDate),
    permittedIds ? inArray(studentAttendanceRecords.studentId, permittedIds) : undefined,
  );
  const [rows, totals] = await Promise.all([
    getDb().select({
      id: studentAttendanceRecords.id,
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
      student: `${row.firstName} ${row.lastName}`,
      state: row.state,
      period: row.period,
      markedAt: row.markedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    })),
    pageInfo: { page: pagination.page, pageSize: pagination.pageSize, total, pageCount: Math.ceil(total / pagination.pageSize) },
    attendanceDate,
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
      user.campusId ? eq(attendanceCorrectionRequests.campusId, user.campusId) : undefined,
      eq(attendanceCorrectionRequests.status, "pending"),
    ))
    .orderBy(desc(attendanceCorrectionRequests.createdAt))
    .limit(100);
  return rows.map((row) => ({ ...row, student: `${row.firstName} ${row.lastName}` }));
}
