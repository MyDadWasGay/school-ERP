import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicYears,
  attendanceCorrectionRequests,
  enrollments,
  notificationEvents,
  studentAttendanceRecords,
  studentAttendanceSessions,
  students,
} from "@/db/schema";
import { ATTENDANCE_DIRECT_EDIT_HOURS } from "@/config/constants";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import type { AttendanceInput } from "../schemas/attendance.schema";

export async function markAttendanceRecord(user: CurrentUser, input: AttendanceInput) {
  const attendanceDate = new Date(input.attendanceDate);
  attendanceDate.setHours(0, 0, 0, 0);
  const student = await getDb().query.students.findFirst({ where: and(
    eq(students.id, input.studentId),
    eq(students.organizationId, user.organizationId),
    user.campusId ? eq(students.campusId, user.campusId) : undefined,
    eq(students.status, "active"),
  ) });
  if (!student) throw new AppError("NOT_FOUND", "Student not found in your campus scope.", 404);
  const enrollment = await getDb().query.enrollments.findFirst({ where: and(
    eq(enrollments.organizationId, user.organizationId),
    eq(enrollments.studentId, student.id),
    lte(enrollments.startsOn, attendanceDate),
    or(isNull(enrollments.endsOn), gte(enrollments.endsOn, attendanceDate)),
    eq(enrollments.status, "active"),
  ) });
  if (!enrollment) throw new AppError("CONFLICT", "The student has no active enrollment for this date.", 409);
  const academicYear = await getDb().query.academicYears.findFirst({ where: and(
    eq(academicYears.id, enrollment.academicYearId),
    eq(academicYears.organizationId, user.organizationId),
    eq(academicYears.isActive, true),
    eq(academicYears.status, "active"),
  ) });
  if (!academicYear) throw new AppError("CONFLICT", "Attendance cannot be marked for a closed academic year.", 409);
  if (user.role === "teacher") {
    const scopes = user.classSectionScopes ?? [];
    const assigned = scopes.some((scope) =>
      scope.classId === enrollment.classId &&
      (!scope.sectionId || scope.sectionId === enrollment.sectionId),
    );
    if (!assigned) throw new AppError("FORBIDDEN", "You are not assigned to this class and section.", 403);
  }
  return getDb().transaction(async (tx) => {
    const existing = await tx.query.studentAttendanceRecords.findFirst({ where: and(
      eq(studentAttendanceRecords.organizationId, user.organizationId),
      eq(studentAttendanceRecords.studentId, student.id),
      eq(studentAttendanceRecords.attendanceDate, attendanceDate),
      eq(studentAttendanceRecords.periodKey, input.periodKey),
    ) });
    const correctionCutoff = Date.now() - ATTENDANCE_DIRECT_EDIT_HOURS * 60 * 60 * 1000;
    const canDirectlyCorrect = user.permissions.includes("*")
      || user.permissions.includes("attendance:approve_correction");
    if (existing && existing.updatedAt.getTime() < correctionCutoff && !canDirectlyCorrect) {
      const pending = await tx.query.attendanceCorrectionRequests.findFirst({ where: and(
        eq(attendanceCorrectionRequests.organizationId, user.organizationId),
        eq(attendanceCorrectionRequests.attendanceId, existing.id),
        eq(attendanceCorrectionRequests.requestedBy, user.id),
        eq(attendanceCorrectionRequests.status, "pending"),
      ) });
      const [correction] = pending
        ? await tx.update(attendanceCorrectionRequests).set({
          requestedState: input.state,
          reason: input.note || "Attendance correction requested",
          updatedAt: new Date(),
          updatedBy: user.id,
        }).where(eq(attendanceCorrectionRequests.id, pending.id)).returning()
        : await tx.insert(attendanceCorrectionRequests).values({
          organizationId: user.organizationId,
          campusId: enrollment.campusId,
          attendanceId: existing.id,
          requestedState: input.state,
          reason: input.note || "Attendance correction requested",
          requestedBy: user.id,
          createdBy: user.id,
          updatedBy: user.id,
        }).returning();
      return { kind: "correction" as const, row: correction };
    }
    let session = existing?.sessionId
      ? await tx.query.studentAttendanceSessions.findFirst({ where: and(
        eq(studentAttendanceSessions.id, existing.sessionId),
        eq(studentAttendanceSessions.organizationId, user.organizationId),
      ) })
      : undefined;
    if (!session) {
      session = await tx.query.studentAttendanceSessions.findFirst({ where: and(
        eq(studentAttendanceSessions.organizationId, user.organizationId),
        eq(studentAttendanceSessions.classId, enrollment.classId),
        eq(studentAttendanceSessions.sectionId, enrollment.sectionId),
        eq(studentAttendanceSessions.attendanceDate, attendanceDate),
        eq(studentAttendanceSessions.periodKey, input.periodKey),
      ) });
    }
    if (!session) {
      [session] = await tx.insert(studentAttendanceSessions).values({
        organizationId: user.organizationId,
        campusId: enrollment.campusId,
        academicYearId: enrollment.academicYearId,
        classId: enrollment.classId,
        sectionId: enrollment.sectionId,
        attendanceDate,
        periodKey: input.periodKey,
        openedBy: user.id,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();
    }
    let row;
    if (existing) {
      [row] = await tx.update(studentAttendanceRecords).set({
        state: input.state,
        note: input.note,
        sessionId: session.id,
        markedBy: user.id,
        updatedAt: new Date(),
        updatedBy: user.id,
      }).where(and(
        eq(studentAttendanceRecords.id, existing.id),
        eq(studentAttendanceRecords.organizationId, user.organizationId),
      )).returning();
    } else {
      [row] = await tx.insert(studentAttendanceRecords).values({
        ...input,
        attendanceDate,
        sessionId: session.id,
        organizationId: user.organizationId,
        campusId: enrollment.campusId,
        academicYearId: enrollment.academicYearId,
        classId: enrollment.classId,
        sectionId: enrollment.sectionId,
        markedBy: user.id,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();
    }
    if (input.state === "absent" && existing?.state !== "absent") {
      await tx.insert(notificationEvents).values({
        organizationId: user.organizationId,
        campusId: enrollment.campusId,
        channel: "in_app",
        payloadJson: JSON.stringify({ type: "student_absent", studentId: student.id, attendanceDate: attendanceDate.toISOString() }),
        createdBy: user.id,
        updatedBy: user.id,
      });
    }
    return { kind: "record" as const, row };
  });
}

export async function reviewAttendanceCorrection(
  user: CurrentUser,
  correctionId: string,
  decision: "approved" | "rejected",
) {
  return getDb().transaction(async (tx) => {
    const correction = await tx.query.attendanceCorrectionRequests.findFirst({ where: and(
      eq(attendanceCorrectionRequests.id, correctionId),
      eq(attendanceCorrectionRequests.organizationId, user.organizationId),
      user.campusId ? eq(attendanceCorrectionRequests.campusId, user.campusId) : undefined,
      eq(attendanceCorrectionRequests.status, "pending"),
    ) });
    if (!correction) throw new AppError("NOT_FOUND", "Pending correction request not found.", 404);
    const attendance = await tx.query.studentAttendanceRecords.findFirst({ where: and(
      eq(studentAttendanceRecords.id, correction.attendanceId),
      eq(studentAttendanceRecords.organizationId, user.organizationId),
    ) });
    if (!attendance) throw new AppError("NOT_FOUND", "The original attendance record no longer exists.", 404);
    const now = new Date();
    if (decision === "approved") {
      await tx.update(studentAttendanceRecords).set({
        state: correction.requestedState,
        updatedAt: now,
        updatedBy: user.id,
      }).where(and(
        eq(studentAttendanceRecords.id, attendance.id),
        eq(studentAttendanceRecords.organizationId, user.organizationId),
      ));
    }
    const [reviewed] = await tx.update(attendanceCorrectionRequests).set({
      status: decision,
      reviewedBy: user.id,
      reviewedAt: now,
      updatedAt: now,
      updatedBy: user.id,
    }).where(and(
      eq(attendanceCorrectionRequests.id, correction.id),
      eq(attendanceCorrectionRequests.organizationId, user.organizationId),
    )).returning();
    return { reviewed, attendance, decision };
  });
}
