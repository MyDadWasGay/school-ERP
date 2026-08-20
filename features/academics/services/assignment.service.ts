import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignmentFeedback, assignmentSubmissions, assignments, documentFiles, enrollments, students } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/app-error";
import { hasPermission } from "@/lib/rbac/permissions";
import { createId } from "@/lib/utils/ids";
import { getReadableStudent, resolvePermittedStudentIds } from "@/features/students/services/students.service";
import type { AssignmentFeedbackInput, AssignmentSubmissionInput } from "../schemas/assignment.schema";

type AssignmentRow = typeof assignments.$inferSelect;
type SubmissionRow = typeof assignmentSubmissions.$inferSelect;

function parseDetails(value: string | null) {
  if (!value) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

function studentIdFromSubmission(row: SubmissionRow) {
  const details = parseDetails(row.detailsJson);
  return typeof details.studentId === "string" ? details.studentId : row.name;
}

async function getAssignment(user: CurrentUser, assignmentId: string) {
  const row = await getDb().query.assignments.findFirst({
    where: and(
      eq(assignments.id, assignmentId),
      eq(assignments.organizationId, user.organizationId),
      user.campusId ? eq(assignments.campusId, user.campusId) : undefined,
      eq(assignments.status, "published"),
    ),
  });
  if (!row) throw new AppError("NOT_FOUND", "Assignment not found in your scope.", 404);
  if (user.role === "teacher" && row.teacherId !== user.id) {
    throw new AppError("FORBIDDEN", "You may only access your assigned classroom work.", 403);
  }
  if (user.role === "teacher" && !(user.classSectionScopes ?? []).some((scope) => scope.classId === row.classId)) {
    throw new AppError("FORBIDDEN", "This assignment is outside your class scope.", 403);
  }
  if (user.role === "student" || user.role === "parent") {
    const permitted = await resolvePermittedStudentIds(user);
    const rows = await getDb().select({ studentId: enrollments.studentId }).from(enrollments).where(and(
      eq(enrollments.organizationId, user.organizationId),
      eq(enrollments.classId, row.classId),
      eq(enrollments.status, "active"),
      permitted?.length ? inArray(enrollments.studentId, permitted) : eq(enrollments.studentId, "__no_student__"),
      user.campusId ? eq(enrollments.campusId, user.campusId) : undefined,
    ));
    if (!rows.length) throw new AppError("FORBIDDEN", "This assignment is outside your linked student scope.", 403);
  }
  return row;
}

async function submissionRows(user: CurrentUser, assignment: AssignmentRow) {
  const rows = await getDb().select().from(assignmentSubmissions).where(and(
    eq(assignmentSubmissions.organizationId, user.organizationId),
    eq(assignmentSubmissions.referenceId, assignment.id),
    user.campusId ? eq(assignmentSubmissions.campusId, user.campusId) : undefined,
    eq(assignmentSubmissions.status, "active"),
  )).orderBy(desc(assignmentSubmissions.createdAt)).limit(500);
  const studentIds = [...new Set(rows.map(studentIdFromSubmission))];
  const names = studentIds.length
    ? await getDb().select({ id: students.id, firstName: students.firstName, lastName: students.lastName }).from(students).where(and(
      eq(students.organizationId, user.organizationId),
      inArray(students.id, studentIds),
    ))
    : [];
  const nameMap = new Map(names.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]));
  const feedbackRows = rows.length
    ? await getDb().select().from(assignmentFeedback).where(and(
      eq(assignmentFeedback.organizationId, user.organizationId),
      inArray(assignmentFeedback.referenceId, rows.map((row) => row.id)),
      eq(assignmentFeedback.status, "active"),
    )).orderBy(desc(assignmentFeedback.createdAt))
    : [];
  const feedbackMap = new Map<string, typeof feedbackRows[number]>();
  for (const feedback of feedbackRows) if (!feedbackMap.has(feedback.referenceId ?? "")) feedbackMap.set(feedback.referenceId ?? "", feedback);
  const attachmentRows = rows.length
    ? await getDb().select({
        id: documentFiles.id,
        category: documentFiles.category,
        secureUrl: documentFiles.secureUrl,
        resourceType: documentFiles.resourceType,
        format: documentFiles.format,
        bytes: documentFiles.bytes,
        originalFilename: documentFiles.originalFilename,
        accessPolicy: documentFiles.accessPolicy,
        createdAt: documentFiles.createdAt,
        status: documentFiles.status,
        entityId: documentFiles.entityId,
      }).from(documentFiles).where(and(
        eq(documentFiles.organizationId, user.organizationId),
        inArray(documentFiles.entityId, rows.map((row) => row.id)),
        eq(documentFiles.entityType, "assignment_submission"),
        eq(documentFiles.status, "active"),
        user.campusId ? eq(documentFiles.campusId, user.campusId) : undefined,
      )).orderBy(desc(documentFiles.createdAt))
    : [];
  const attachmentMap = new Map<string, typeof attachmentRows>();
  for (const attachment of attachmentRows) {
    const existing = attachmentMap.get(attachment.entityId) ?? [];
    existing.push(attachment);
    attachmentMap.set(attachment.entityId, existing);
  }
  return rows.map((row) => {
    const details = parseDetails(row.detailsJson);
    const feedback = feedbackMap.get(row.id);
    const feedbackDetails = parseDetails(feedback?.detailsJson ?? null);
    return {
      id: row.id,
      studentId: studentIdFromSubmission(row),
      studentName: nameMap.get(studentIdFromSubmission(row)) ?? "Student",
      response: typeof details.response === "string" ? details.response : "",
      submittedAt: row.effectiveAt?.toISOString() ?? row.createdAt.toISOString(),
      status: row.status,
      score: typeof feedbackDetails.score === "number" ? feedbackDetails.score : null,
      feedback: typeof feedbackDetails.comment === "string" ? feedbackDetails.comment : null,
      attachments: (attachmentMap.get(row.id) ?? []).map((attachment) => ({
        id: attachment.id,
        category: attachment.category,
        secureUrl: attachment.secureUrl,
        resourceType: attachment.resourceType,
        format: attachment.format,
        bytes: attachment.bytes,
        originalFilename: attachment.originalFilename,
        accessPolicy: attachment.accessPolicy,
        createdAt: attachment.createdAt.toISOString(),
        status: attachment.status,
      })),
    };
  });
}

export async function getAssignmentDetail(user: CurrentUser, assignmentId: string) {
  const assignment = await getAssignment(user, assignmentId);
  let submissions = await submissionRows(user, assignment);
  if (user.role === "student" || user.role === "parent") {
    const permitted = await resolvePermittedStudentIds(user);
    submissions = submissions.filter((row) => permitted?.includes(row.studentId) === true);
  }
  const details = parseDetails(assignment.detailsJson);
  return {
    id: assignment.id,
    title: assignment.title,
    teacherId: assignment.teacherId,
    classId: assignment.classId,
    subjectId: assignment.subjectId,
    dueAt: assignment.dueAt.toISOString(),
    status: assignment.status,
    instructions: typeof details.details === "string" ? details.details : null,
    submissions,
  };
}

export async function submitAssignment(user: CurrentUser, assignmentId: string, input: AssignmentSubmissionInput) {
  const assignment = await getAssignment(user, assignmentId);
  if (user.role !== "student" && user.role !== "parent") throw new AppError("FORBIDDEN", "Only a student or linked parent may submit this assignment.", 403);
  const studentId = input.studentId ?? user.linkedStudentId;
  if (!studentId) throw new AppError("VALIDATION_ERROR", "Choose the student submitting this assignment.", 422);
  const student = await getReadableStudent(user, studentId);
  const enrollment = await getDb().query.enrollments.findFirst({ where: and(
    eq(enrollments.organizationId, user.organizationId),
    eq(enrollments.studentId, student.id),
    eq(enrollments.classId, assignment.classId),
    eq(enrollments.status, "active"),
    user.campusId ? eq(enrollments.campusId, user.campusId) : undefined,
  ) });
  if (!enrollment) throw new AppError("FORBIDDEN", "The selected student is not enrolled in this assignment's class.", 403);
  const existingRows = await getDb().select().from(assignmentSubmissions).where(and(
    eq(assignmentSubmissions.organizationId, user.organizationId),
    eq(assignmentSubmissions.referenceId, assignment.id),
    eq(assignmentSubmissions.name, student.id),
  )).orderBy(desc(assignmentSubmissions.createdAt)).limit(1);
  const now = new Date();
  const detailsJson = JSON.stringify({ studentId: student.id, response: input.response });
  if (existingRows[0]) {
    const [updated] = await getDb().update(assignmentSubmissions).set({
      detailsJson,
      effectiveAt: now,
      status: "active",
      updatedAt: now,
      updatedBy: user.id,
    }).where(eq(assignmentSubmissions.id, existingRows[0].id)).returning();
    return updated ?? existingRows[0];
  }
  const [created] = await getDb().insert(assignmentSubmissions).values({
    id: createId("submission"),
    organizationId: user.organizationId,
    campusId: assignment.campusId,
    name: student.id,
    referenceId: assignment.id,
    effectiveAt: now,
    detailsJson,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!created) throw new AppError("DATABASE_ERROR", "Unable to submit the assignment.", 500);
  return created;
}

export async function gradeAssignment(user: CurrentUser, assignmentId: string, submissionId: string, input: AssignmentFeedbackInput) {
  const assignment = await getAssignment(user, assignmentId);
  if (user.role === "teacher" && assignment.teacherId !== user.id) throw new AppError("FORBIDDEN", "Only the assignment teacher may grade these submissions.", 403);
  if (!hasPermission(user, "exams:enter_marks") && !hasPermission(user, "academics:update")) throw new AppError("FORBIDDEN", "Assignment grading permission is required.", 403);
  const submission = await getDb().query.assignmentSubmissions.findFirst({ where: and(
    eq(assignmentSubmissions.id, submissionId),
    eq(assignmentSubmissions.organizationId, user.organizationId),
    eq(assignmentSubmissions.referenceId, assignment.id),
    eq(assignmentSubmissions.status, "active"),
  ) });
  if (!submission) throw new AppError("NOT_FOUND", "Assignment submission not found.", 404);
  const existing = await getDb().query.assignmentFeedback.findFirst({ where: and(
    eq(assignmentFeedback.organizationId, user.organizationId),
    eq(assignmentFeedback.referenceId, submission.id),
    eq(assignmentFeedback.status, "active"),
  ) });
  const now = new Date();
  const detailsJson = JSON.stringify({ score: input.score ?? null, comment: input.comment ?? "" });
  if (existing) {
    await getDb().update(assignmentFeedback).set({ detailsJson, effectiveAt: now, updatedAt: now, updatedBy: user.id }).where(eq(assignmentFeedback.id, existing.id));
  } else {
    await getDb().insert(assignmentFeedback).values({
      id: createId("feedback"), organizationId: user.organizationId, campusId: assignment.campusId,
      name: `Feedback for ${submission.name}`, referenceId: submission.id, effectiveAt: now,
      detailsJson, status: "active", createdBy: user.id, updatedBy: user.id,
    });
  }
  await getDb().update(assignmentSubmissions).set({ status: "returned", updatedAt: now, updatedBy: user.id }).where(eq(assignmentSubmissions.id, submission.id));
  return { assignmentId: assignment.id, submissionId: submission.id, status: "returned" as const };
}
