import "server-only";
import { and, count, eq, lt, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicYears,
  classes,
  enrollments,
  exams,
  examSchedules,
  examSchemes,
  marksEntries,
  resultPublications,
  students,
  subjects,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import type { MarksInput } from "../schemas/marks.schema";
import { canTransitionExamStatus, type ExamInput, type ExamScheduleInput, type ExamStatus } from "../schemas/planning.schema";

function scopedCampus(user: CurrentUser, campusId?: string | null) {
  if (user.campusId && campusId && user.campusId !== campusId) {
    throw new AppError("FORBIDDEN", "The selected campus is outside your scope.", 403);
  }
  return user.campusId ?? campusId ?? null;
}

export async function createExam(user: CurrentUser, input: ExamInput) {
  const campusId = scopedCampus(user);
  return getDb().transaction(async (tx) => {
    const year = await tx.query.academicYears.findFirst({ where: and(
      eq(academicYears.id, input.academicYearId),
      eq(academicYears.organizationId, user.organizationId),
      campusId ? eq(academicYears.campusId, campusId) : undefined,
      eq(academicYears.status, "active"),
    ) });
    if (!year) throw new AppError("NOT_FOUND", "Academic year not found in your scope.", 404);
    if (input.examSchemeId) {
      const scheme = await tx.query.examSchemes.findFirst({ where: and(
        eq(examSchemes.id, input.examSchemeId),
        eq(examSchemes.organizationId, user.organizationId),
        eq(examSchemes.academicYearId, year.id),
        campusId ? eq(examSchemes.campusId, campusId) : undefined,
        eq(examSchemes.status, "active"),
      ) });
      if (!scheme) throw new AppError("NOT_FOUND", "Exam scheme not found in the selected academic year.", 404);
    }
    const [row] = await tx.insert(exams).values({
      organizationId: user.organizationId,
      campusId,
      academicYearId: year.id,
      examSchemeId: input.examSchemeId,
      name: input.name,
      maxMarks: input.maxMarks,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    return row;
  });
}

export async function scheduleExam(user: CurrentUser, input: ExamScheduleInput) {
  return getDb().transaction(async (tx) => {
    const exam = await tx.query.exams.findFirst({ where: and(
      eq(exams.id, input.examId),
      eq(exams.organizationId, user.organizationId),
      user.campusId ? eq(exams.campusId, user.campusId) : undefined,
    ) });
    if (!exam) throw new AppError("NOT_FOUND", "Exam not found.", 404);
    if (!["draft", "planning"].includes(exam.status)) {
      throw new AppError("CONFLICT", "Only draft or planning exams can be scheduled.", 409);
    }
    const [subject, classRow] = await Promise.all([
      tx.query.subjects.findFirst({ where: and(
        eq(subjects.id, input.subjectId),
        eq(subjects.organizationId, user.organizationId),
        exam.campusId ? eq(subjects.campusId, exam.campusId) : undefined,
        eq(subjects.status, "active"),
      ) }),
      tx.query.classes.findFirst({ where: and(
        eq(classes.id, input.classId),
        eq(classes.organizationId, user.organizationId),
        exam.campusId ? eq(classes.campusId, exam.campusId) : undefined,
        eq(classes.status, "active"),
      ) }),
    ]);
    if (!subject) throw new AppError("NOT_FOUND", "Subject not found in the exam campus.", 404);
    if (!classRow) throw new AppError("NOT_FOUND", "Class not found in the exam campus.", 404);
    if (exam.startsOn && input.startsAt < exam.startsOn) throw new AppError("VALIDATION_ERROR", "Schedule starts before the exam window.", 422);
    if (exam.endsOn && input.endsAt > exam.endsOn) throw new AppError("VALIDATION_ERROR", "Schedule ends after the exam window.", 422);
    const clash = await tx.query.examSchedules.findFirst({ where: and(
      eq(examSchedules.organizationId, user.organizationId),
      eq(examSchedules.classId, classRow.id),
      eq(examSchedules.status, "active"),
      lt(examSchedules.startsAt, input.endsAt),
      gt(examSchedules.endsAt, input.startsAt),
    ) });
    if (clash) throw new AppError("CONFLICT", "This class already has an overlapping exam schedule.", 409);
    const [row] = await tx.insert(examSchedules).values({
      organizationId: user.organizationId,
      campusId: exam.campusId,
      examId: exam.id,
      subjectId: subject.id,
      classId: classRow.id,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      roomId: input.roomId || undefined,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    if (exam.status === "draft") {
      await tx.update(exams).set({ status: "planning", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(exams.id, exam.id), eq(exams.organizationId, user.organizationId)));
    }
    return row;
  });
}

export async function transitionExamStatus(user: CurrentUser, examId: string, nextStatus: ExamStatus) {
  return getDb().transaction(async (tx) => {
    const exam = await tx.query.exams.findFirst({ where: and(
      eq(exams.id, examId),
      eq(exams.organizationId, user.organizationId),
      user.campusId ? eq(exams.campusId, user.campusId) : undefined,
    ) });
    if (!exam) throw new AppError("NOT_FOUND", "Exam not found.", 404);
    if (!canTransitionExamStatus(exam.status, nextStatus)) {
      throw new AppError("CONFLICT", `Exam cannot move from ${exam.status} to ${nextStatus}.`, 409);
    }
    if (nextStatus === "marks_entry") {
      const schedules = await tx.select({ value: count() }).from(examSchedules).where(and(
        eq(examSchedules.organizationId, user.organizationId),
        eq(examSchedules.examId, exam.id),
        eq(examSchedules.status, "active"),
      ));
      if ((schedules[0]?.value ?? 0) === 0) throw new AppError("CONFLICT", "Add at least one active schedule before opening marks entry.", 409);
    }
    if (nextStatus === "approved") {
      const marks = await tx.select({ value: count() }).from(marksEntries).where(and(
        eq(marksEntries.organizationId, user.organizationId),
        eq(marksEntries.examId, exam.id),
      ));
      if ((marks[0]?.value ?? 0) === 0) throw new AppError("CONFLICT", "At least one marks entry is required before approval.", 409);
    }
    const [row] = await tx.update(exams).set({ status: nextStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(
      eq(exams.id, exam.id), eq(exams.organizationId, user.organizationId), eq(exams.status, exam.status),
    )).returning();
    return { before: exam, row };
  });
}

export function validateMarks(input: MarksInput) {
  return input.marks >= 0 && (input.maxMarks === undefined || input.marks <= input.maxMarks);
}

export async function saveMarksEntry(user: CurrentUser, input: MarksInput) {
  return getDb().transaction(async (tx) => {
    const exam = await tx.query.exams.findFirst({ where: and(
      eq(exams.id, input.examId),
      eq(exams.organizationId, user.organizationId),
      user.campusId ? eq(exams.campusId, user.campusId) : undefined,
    ) });
    if (!exam) throw new AppError("NOT_FOUND", "Exam not found.", 404);
    if (!["draft", "marks_entry", "moderation"].includes(exam.status)) {
      throw new AppError("CONFLICT", "Marks entry is closed for this exam.", 409);
    }
    if (input.marks > exam.maxMarks) throw new AppError("VALIDATION_ERROR", `Marks cannot exceed ${exam.maxMarks}.`, 422);
    const [student, subject] = await Promise.all([
      tx.query.students.findFirst({ where: and(
        eq(students.id, input.studentId),
        eq(students.organizationId, user.organizationId),
        exam.campusId ? eq(students.campusId, exam.campusId) : undefined,
        eq(students.status, "active"),
      ) }),
      tx.query.subjects.findFirst({ where: and(
        eq(subjects.id, input.subjectId),
        eq(subjects.organizationId, user.organizationId),
        exam.campusId ? eq(subjects.campusId, exam.campusId) : undefined,
        eq(subjects.status, "active"),
      ) }),
    ]);
    if (!student) throw new AppError("NOT_FOUND", "Student not found in the exam campus.", 404);
    if (!subject) throw new AppError("NOT_FOUND", "Subject not found in the exam campus.", 404);
    const enrollment = await tx.query.enrollments.findFirst({ where: and(
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.studentId, student.id),
      eq(enrollments.academicYearId, exam.academicYearId),
      eq(enrollments.status, "active"),
    ) });
    if (!enrollment) throw new AppError("CONFLICT", "The student is not enrolled in this exam academic year.", 409);
    const schedule = await tx.query.examSchedules.findFirst({ where: and(
      eq(examSchedules.organizationId, user.organizationId),
      eq(examSchedules.examId, exam.id),
      eq(examSchedules.subjectId, subject.id),
      eq(examSchedules.classId, enrollment.classId),
      eq(examSchedules.status, "active"),
    ) });
    if (!schedule) throw new AppError("CONFLICT", "This subject and class are not configured in the exam schedule.", 409);
    if (user.role === "teacher") {
      const assigned = (user.classSectionScopes ?? []).some((scope) =>
        scope.classId === enrollment.classId
        && (!scope.sectionId || scope.sectionId === enrollment.sectionId),
      );
      if (!assigned) throw new AppError("FORBIDDEN", "You are not assigned to this student class and section.", 403);
    }
    const existing = await tx.query.marksEntries.findFirst({ where: and(
      eq(marksEntries.organizationId, user.organizationId),
      eq(marksEntries.examId, input.examId),
      eq(marksEntries.studentId, input.studentId),
      eq(marksEntries.subjectId, input.subjectId),
    ) });
    if (existing) {
      const [row] = await tx.update(marksEntries).set({
        marks: input.marks,
        state: "entered",
        enteredBy: user.id,
        updatedAt: new Date(),
        updatedBy: user.id,
      }).where(and(eq(marksEntries.id, existing.id), eq(marksEntries.organizationId, user.organizationId))).returning();
      return row;
    }
    const [row] = await tx.insert(marksEntries).values({
      organizationId: user.organizationId,
      campusId: exam.campusId,
      examId: input.examId,
      studentId: input.studentId,
      subjectId: input.subjectId,
      marks: input.marks,
      enteredBy: user.id,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    return row;
  });
}

export async function publishExamResults(user: CurrentUser, examId: string) {
  return getDb().transaction(async (tx) => {
    const exam = await tx.query.exams.findFirst({ where: and(
      eq(exams.id, examId),
      eq(exams.organizationId, user.organizationId),
      user.campusId ? eq(exams.campusId, user.campusId) : undefined,
    ) });
    if (!exam) throw new AppError("NOT_FOUND", "Exam not found.", 404);
    if (exam.status !== "approved") {
      throw new AppError("CONFLICT", "Results must be approved before publication.", 409);
    }
    const marksCount = await tx.select({ value: count() }).from(marksEntries).where(and(
      eq(marksEntries.organizationId, user.organizationId),
      eq(marksEntries.examId, exam.id),
    ));
    if ((marksCount[0]?.value ?? 0) === 0) {
      throw new AppError("CONFLICT", "At least one marks entry is required before results can be published.", 409);
    }
    const existing = await tx.query.resultPublications.findFirst({ where: and(
      eq(resultPublications.examId, exam.id),
      eq(resultPublications.organizationId, user.organizationId),
    ) });
    if (existing?.status === "published") return existing;
    const now = new Date();
    const [publication] = existing
      ? await tx.update(resultPublications).set({ status: "published", publishedAt: now, publishedBy: user.id, updatedAt: now, updatedBy: user.id }).where(eq(resultPublications.id, existing.id)).returning()
      : await tx.insert(resultPublications).values({ organizationId: user.organizationId, campusId: exam.campusId, examId: exam.id, status: "published", publishedAt: now, publishedBy: user.id, createdBy: user.id, updatedBy: user.id }).returning();
    await tx.update(exams).set({ status: "published", updatedAt: now, updatedBy: user.id }).where(and(eq(exams.id, exam.id), eq(exams.organizationId, user.organizationId)));
    return publication;
  });
}
