import { and, desc, eq, inArray, like, ne, or, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assignments,
  classes,
  curriculums,
  lessonPlans,
  sections,
  subjects,
  substitutions,
  teachingResources,
  teacherAssignments,
  timetableTemplates,
  users,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { AcademicKind, AcademicRecordInput } from "../schemas/academic.schema";

type CatalogTable = typeof curriculums;

export const academicEntityKinds = ["teacher", "class", "subject", "section"] as const;
export type AcademicEntityKind = (typeof academicEntityKinds)[number];
export type AcademicEntityOption = { id: string; label: string; detail: string; campusId?: string | null; classId?: string | null };

function campusScope(user: CurrentUser, column: AnyColumn) {
  return user.campusIds?.length ? inArray(column, user.campusIds) : user.campusId ? eq(column, user.campusId) : undefined;
}

/**
 * Searchable academic selectors intentionally resolve labels on the server.
 * The browser can submit an id, but it never decides whether that id is in
 * the current tenant/campus scope; createAcademicRecord validates it again.
 */
export async function listAcademicEntityOptions(user: CurrentUser, kind: AcademicEntityKind, search?: string, classId?: string) {
  const query = search?.trim();
  if (kind === "teacher") {
    const rows = await getDb().select({ id: users.id, label: users.displayName, email: users.email, campusId: users.campusId }).from(users).where(and(
      eq(users.organizationId, user.organizationId), eq(users.status, "active"), eq(users.role, "teacher"), campusScope(user, users.campusId),
      query ? or(like(users.displayName, `%${query}%`), like(users.email, `%${query}%`)) : undefined,
    )).orderBy(users.displayName).limit(50);
    return rows.map((row): AcademicEntityOption => ({ id: row.id, label: row.label, detail: row.email, campusId: row.campusId }));
  }
  if (kind === "class") {
    const rows = await getDb().select({ id: classes.id, label: classes.name, code: classes.code, campusId: classes.campusId }).from(classes).where(and(
      eq(classes.organizationId, user.organizationId), eq(classes.status, "active"), campusScope(user, classes.campusId),
      query ? or(like(classes.name, `%${query}%`), like(classes.code, `%${query}%`)) : undefined,
    )).orderBy(classes.sortOrder, classes.name).limit(50);
    return rows.map((row): AcademicEntityOption => ({ id: row.id, label: row.label, detail: row.code, campusId: row.campusId }));
  }
  if (kind === "subject") {
    const rows = await getDb().select({ id: subjects.id, label: subjects.name, code: subjects.code, campusId: subjects.campusId }).from(subjects).where(and(
      eq(subjects.organizationId, user.organizationId), eq(subjects.status, "active"), campusScope(user, subjects.campusId),
      query ? or(like(subjects.name, `%${query}%`), like(subjects.code, `%${query}%`)) : undefined,
    )).orderBy(subjects.name).limit(50);
    return rows.map((row): AcademicEntityOption => ({ id: row.id, label: row.label, detail: row.code, campusId: row.campusId }));
  }
  const rows = await getDb().select({ id: sections.id, label: sections.name, classId: sections.classId, campusId: sections.campusId }).from(sections).where(and(
    eq(sections.organizationId, user.organizationId), eq(sections.status, "active"), campusScope(user, sections.campusId),
    classId ? eq(sections.classId, classId) : undefined,
    query ? like(sections.name, `%${query}%`) : undefined,
  )).orderBy(sections.name).limit(50);
  return rows.map((row): AcademicEntityOption => ({ id: row.id, label: row.label, detail: `Class ${row.classId}`, campusId: row.campusId, classId: row.classId }));
}

const catalogTables: Record<Exclude<AcademicKind, "lesson-plans" | "assignments">, CatalogTable> = {
  curriculum: curriculums,
  "teacher-allocation": teacherAssignments as CatalogTable,
  timetable: timetableTemplates as CatalogTable,
  substitutions: substitutions as CatalogTable,
  resources: teachingResources as CatalogTable,
};

function scope(user: CurrentUser, table: CatalogTable) {
  return and(
    eq(table.organizationId, user.organizationId),
    user.campusId ? eq(table.campusId, user.campusId) : undefined,
    ne(table.status, "archived"),
  );
}

function detailFromInput(input: AcademicRecordInput) {
  return JSON.stringify({
    teacherId: input.teacherId,
    classId: input.classId,
    subjectId: input.subjectId,
    title: input.title,
    scheduledFor: input.scheduledFor?.toISOString(),
    dueAt: input.dueAt?.toISOString(),
    details: input.details,
  });
}

function readableDetail(detailsJson: string | null, fallback: string) {
  if (!detailsJson) return fallback;
  try {
    const details = JSON.parse(detailsJson) as Record<string, unknown>;
    const labels = [details.title, details.subjectId, details.classId, details.details].filter((item): item is string => typeof item === "string" && item.length > 0);
    return labels.join(" · ") || fallback;
  } catch {
    return fallback;
  }
}

function publicReadableDetail(detailsJson: string | null, fallback: string) {
  const legacyDetail = readableDetail(detailsJson, fallback);
  if (!detailsJson) return legacyDetail;
  try {
    const details = JSON.parse(detailsJson) as Record<string, unknown>;
    const labels = [details.title, details.details].filter((item): item is string => typeof item === "string" && item.length > 0);
    return labels.join(" · ") || fallback;
  } catch {
    return fallback;
  }
}

async function assertAcademicReferences(user: CurrentUser, input: AcademicRecordInput) {
  if (user.role === "teacher" && input.teacherId && input.teacherId !== user.id) throw new AppError("FORBIDDEN", "Teachers may only create records for their own identity.", 403);
  const [teacher, classRow, subject] = await Promise.all([
    input.teacherId ? getDb().query.users.findFirst({ where: and(eq(users.id, input.teacherId), eq(users.organizationId, user.organizationId), campusScope(user, users.campusId), eq(users.status, "active")) }) : undefined,
    input.classId ? getDb().query.classes.findFirst({ where: and(eq(classes.id, input.classId), eq(classes.organizationId, user.organizationId), campusScope(user, classes.campusId), eq(classes.status, "active")) }) : undefined,
    input.subjectId ? getDb().query.subjects.findFirst({ where: and(eq(subjects.id, input.subjectId), eq(subjects.organizationId, user.organizationId), campusScope(user, subjects.campusId), eq(subjects.status, "active")) }) : undefined,
  ]);
  if (input.teacherId && !teacher) throw new AppError("NOT_FOUND", "Teacher is outside your campus scope.", 404);
  if (input.classId && !classRow) throw new AppError("NOT_FOUND", "Class is outside your campus scope.", 404);
  if (input.subjectId && !subject) throw new AppError("NOT_FOUND", "Subject is outside your campus scope.", 404);
}

export async function listAcademicRecords(user: CurrentUser, kind: AcademicKind, search?: string) {
  const query = search?.trim();
  if (kind === "lesson-plans") {
    const rows = await getDb().select().from(lessonPlans).where(and(
      eq(lessonPlans.organizationId, user.organizationId),
      user.campusId ? eq(lessonPlans.campusId, user.campusId) : undefined,
      ne(lessonPlans.status, "archived"),
      query ? or(like(lessonPlans.title, `%${query}%`), like(lessonPlans.subjectId, `%${query}%`), like(lessonPlans.classId, `%${query}%`)) : undefined,
    )).orderBy(desc(lessonPlans.createdAt)).limit(200);
    rows.forEach((row) => { row.classId = "Class and subject linked"; row.subjectId = "context"; });
    return rows.map((row) => ({ id: row.id, name: row.title, detail: `${row.classId} · ${row.subjectId}${row.scheduledFor ? ` · ${row.scheduledFor.toISOString()}` : ""}`, status: row.status }));
  }
  if (kind === "assignments") {
    const rows = await getDb().select().from(assignments).where(and(
      eq(assignments.organizationId, user.organizationId),
      user.campusId ? eq(assignments.campusId, user.campusId) : undefined,
      ne(assignments.status, "archived"),
      query ? or(like(assignments.title, `%${query}%`), like(assignments.subjectId, `%${query}%`), like(assignments.classId, `%${query}%`)) : undefined,
    )).orderBy(desc(assignments.createdAt)).limit(200);
    rows.forEach((row) => { row.classId = "Class and subject linked"; row.subjectId = "context"; });
    return rows.map((row) => ({ id: row.id, name: row.title, detail: `${row.classId} · ${row.subjectId} · due ${row.dueAt.toISOString()}`, status: row.status }));
  }
  const table = catalogTables[kind];
  const rows = await getDb().select().from(table).where(and(
    scope(user, table),
    query ? or(like(table.name, `%${query}%`), like(table.code, `%${query}%`), like(table.detailsJson, `%${query}%`)) : undefined,
  )).orderBy(desc(table.createdAt)).limit(200);
  return rows.map((row) => ({ id: row.id, name: row.name, detail: publicReadableDetail(row.detailsJson, row.code ?? "Academic context configured"), status: row.status }));
}

export async function createAcademicRecord(user: CurrentUser, input: AcademicRecordInput) {
  await assertAcademicReferences(user, input);
  if (input.kind === "lesson-plans") {
    if (!input.teacherId || !input.classId || !input.subjectId || !input.scheduledFor) throw new AppError("VALIDATION_ERROR", "Lesson plans require a teacher, class, subject and scheduled date.", 422);
    const [row] = await getDb().insert(lessonPlans).values({
      id: createId("lesson_plan"), organizationId: user.organizationId, campusId: user.campusId,
      teacherId: input.teacherId, classId: input.classId, subjectId: input.subjectId, title: input.name,
      scheduledFor: input.scheduledFor, status: "draft", createdBy: user.id, updatedBy: user.id,
    }).returning();
    if (!row) throw new AppError("DATABASE_ERROR", "Unable to create lesson plan.", 500);
    return row;
  }
  if (input.kind === "assignments") {
    if (!input.teacherId || !input.classId || !input.subjectId || !input.dueAt) throw new AppError("VALIDATION_ERROR", "Assignments require a teacher, class, subject and due date.", 422);
    const [row] = await getDb().insert(assignments).values({
      id: createId("assignment"), organizationId: user.organizationId, campusId: user.campusId,
      teacherId: input.teacherId, classId: input.classId, subjectId: input.subjectId, title: input.name,
      dueAt: input.dueAt, status: "draft", createdBy: user.id, updatedBy: user.id,
    }).returning();
    if (!row) throw new AppError("DATABASE_ERROR", "Unable to create assignment.", 500);
    return row;
  }
  const table = catalogTables[input.kind];
  const [row] = await getDb().insert(table).values({
    id: createId(input.kind.replaceAll("-", "_")), organizationId: user.organizationId, campusId: user.campusId,
    name: input.name, code: input.code ?? null, referenceId: input.referenceId ?? null,
    effectiveAt: input.scheduledFor ?? null, detailsJson: detailFromInput(input), status: "draft",
    createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create academic record.", 500);
  return row;
}

export async function archiveAcademicRecord(user: CurrentUser, kind: AcademicKind, id: string) {
  if (kind === "lesson-plans") {
    const result = await getDb().update(lessonPlans).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(lessonPlans.id, id), eq(lessonPlans.organizationId, user.organizationId), user.campusId ? eq(lessonPlans.campusId, user.campusId) : undefined)).returning({ id: lessonPlans.id });
    if (!result[0]) throw new AppError("NOT_FOUND", "Lesson plan not found in your scope.", 404);
    return result[0];
  }
  if (kind === "assignments") {
    const result = await getDb().update(assignments).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(assignments.id, id), eq(assignments.organizationId, user.organizationId), user.campusId ? eq(assignments.campusId, user.campusId) : undefined)).returning({ id: assignments.id });
    if (!result[0]) throw new AppError("NOT_FOUND", "Assignment not found in your scope.", 404);
    return result[0];
  }
  const table = catalogTables[kind];
  const result = await getDb().update(table).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(table.id, id), eq(table.organizationId, user.organizationId), user.campusId ? eq(table.campusId, user.campusId) : undefined)).returning({ id: table.id });
  if (!result[0]) throw new AppError("NOT_FOUND", "Academic record not found in your scope.", 404);
  return result[0];
}
