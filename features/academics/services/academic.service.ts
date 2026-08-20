import { and, desc, eq, inArray, like, ne, or, type AnyColumn } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assignments,
  classes,
  curriculums,
  enrollments,
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
import { hasPermission } from "@/lib/rbac/permissions";
import { createId } from "@/lib/utils/ids";
import { formatIndiaDateTime } from "@/lib/utils/india-time";
import { resolvePermittedStudentIds } from "@/features/students/services/students.service";
import type { AcademicKind, AcademicRecordInput } from "../schemas/academic.schema";

type CatalogTable = typeof curriculums;

export const academicEntityKinds = ["teacher", "class", "subject", "section"] as const;
export type AcademicEntityKind = (typeof academicEntityKinds)[number];
export type AcademicEntityOption = { id: string; label: string; detail: string; campusId?: string | null; classId?: string | null };

function campusScope(user: CurrentUser, column: AnyColumn) {
  if (user.campusIds?.length) return inArray(column, user.campusIds);
  if (user.campusId) return eq(column, user.campusId);
  return hasPermission(user, "organizations:update") ? undefined : eq(column, "__no_campus__");
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
      eq(users.organizationId, user.organizationId), eq(users.status, "active"), eq(users.role, "teacher"), user.role === "teacher" ? eq(users.id, user.id) : undefined, campusScope(user, users.campusId),
      query ? or(like(users.displayName, `%${query}%`), like(users.email, `%${query}%`)) : undefined,
    )).orderBy(users.displayName).limit(50);
    return rows.map((row): AcademicEntityOption => ({ id: row.id, label: row.label, detail: row.email, campusId: row.campusId }));
  }
  if (kind === "class") {
    const teacherClassIds = user.role === "teacher" ? [...new Set((user.classSectionScopes ?? []).map((scope) => scope.classId))] : undefined;
    if (teacherClassIds && teacherClassIds.length === 0) return [];
    const rows = await getDb().select({ id: classes.id, label: classes.name, code: classes.code, campusId: classes.campusId }).from(classes).where(and(
      eq(classes.organizationId, user.organizationId), eq(classes.status, "active"), campusScope(user, classes.campusId),
      teacherClassIds ? inArray(classes.id, teacherClassIds) : undefined,
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
    campusScope(user, table.campusId),
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

type AcademicReadScope = { classIds: Set<string>; teacherId?: string } | undefined;

async function academicReadScope(user: CurrentUser): Promise<AcademicReadScope> {
  if (user.role === "teacher") {
    return {
      classIds: new Set((user.classSectionScopes ?? []).map((scope) => scope.classId)),
      teacherId: user.id,
    };
  }
  if (user.role !== "student" && user.role !== "parent") return undefined;
  const permittedStudentIds = await resolvePermittedStudentIds(user);
  if (!permittedStudentIds?.length) return { classIds: new Set() };
  const rows = await getDb().select({ classId: enrollments.classId }).from(enrollments).where(and(
    eq(enrollments.organizationId, user.organizationId),
    eq(enrollments.status, "active"),
    inArray(enrollments.studentId, permittedStudentIds),
    user.campusId ? eq(enrollments.campusId, user.campusId) : undefined,
  ));
  return { classIds: new Set(rows.map((row) => row.classId)) };
}

function catalogRowInScope(row: { detailsJson: string | null }, readScope: Exclude<AcademicReadScope, undefined>) {
  if (!row.detailsJson) return false;
  try {
    const details = JSON.parse(row.detailsJson) as Record<string, unknown>;
    const classId = typeof details.classId === "string" ? details.classId : undefined;
    const teacherId = typeof details.teacherId === "string" ? details.teacherId : undefined;
    if (readScope.teacherId && teacherId === readScope.teacherId) return true;
    return classId !== undefined && readScope.classIds.has(classId);
  } catch {
    return false;
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
  if (user.role === "teacher" && input.classId && !(user.classSectionScopes ?? []).some((scope) => scope.classId === input.classId)) {
    throw new AppError("FORBIDDEN", "You are not assigned to the selected class.", 403);
  }
  const referenceCampusIds = [teacher?.campusId, classRow?.campusId, subject?.campusId].filter((value): value is string => Boolean(value));
  const uniqueCampusIds = [...new Set(referenceCampusIds)];
  if (uniqueCampusIds.length > 1) throw new AppError("VALIDATION_ERROR", "Teacher, class and subject must belong to the same campus.", 422);
  const campusId = uniqueCampusIds[0] ?? user.campusId ?? null;
  if (user.campusId && campusId && user.campusId !== campusId) throw new AppError("TENANT_SCOPE_ERROR", "Academic references must belong to the current campus.", 403);
  return { campusId };
}

export async function listAcademicRecords(user: CurrentUser, kind: AcademicKind, search?: string) {
  const query = search?.trim();
  if (kind === "lesson-plans") {
    const readScope = await academicReadScope(user);
    const rows = await getDb().select().from(lessonPlans).where(and(
      eq(lessonPlans.organizationId, user.organizationId),
      campusScope(user, lessonPlans.campusId),
      ne(lessonPlans.status, "archived"),
      readScope?.teacherId ? eq(lessonPlans.teacherId, readScope.teacherId) : undefined,
      readScope && readScope.classIds.size ? inArray(lessonPlans.classId, [...readScope.classIds]) : readScope ? eq(lessonPlans.classId, "__no_class__") : undefined,
      query ? or(like(lessonPlans.title, `%${query}%`), like(lessonPlans.subjectId, `%${query}%`), like(lessonPlans.classId, `%${query}%`)) : undefined,
    )).orderBy(desc(lessonPlans.createdAt)).limit(200);
    rows.forEach((row) => { row.classId = "Class and subject linked"; row.subjectId = "context"; });
      return rows.map((row) => ({ id: row.id, name: row.title, detail: `${row.classId} · ${row.subjectId}${row.scheduledFor ? ` · ${formatIndiaDateTime(row.scheduledFor)}` : ""}`, status: row.status }));
  }
  if (kind === "assignments") {
    const permittedStudentIds = await resolvePermittedStudentIds(user);
    if (permittedStudentIds !== undefined && permittedStudentIds.length === 0) return [];
    if (permittedStudentIds !== undefined) {
      const assignmentWhere = and(
        eq(assignments.organizationId, user.organizationId),
        campusScope(user, assignments.campusId),
        user.role === "student" || user.role === "parent"
          ? eq(assignments.status, "published")
          : ne(assignments.status, "archived"),
        user.role === "teacher" ? eq(assignments.teacherId, user.id) : undefined,
        query ? or(like(assignments.title, `%${query}%`), like(assignments.subjectId, `%${query}%`), like(assignments.classId, `%${query}%`)) : undefined,
      );
      const rows = await getDb().select({ row: assignments }).from(assignments).innerJoin(enrollments, and(
        eq(enrollments.organizationId, user.organizationId),
        eq(enrollments.classId, assignments.classId),
        eq(enrollments.status, "active"),
        inArray(enrollments.studentId, permittedStudentIds),
        user.campusId ? eq(enrollments.campusId, user.campusId) : undefined,
      )).where(assignmentWhere).orderBy(desc(assignments.createdAt)).limit(200);
      const uniqueRows = [...new Map(rows.map(({ row }) => [row.id, row])).values()];
      return uniqueRows.map((row) => ({ id: row.id, name: row.title, detail: `${row.classId} | ${row.subjectId} | due ${formatIndiaDateTime(row.dueAt)}`, status: row.status }));
    }
    const rows = await getDb().select().from(assignments).where(and(
      eq(assignments.organizationId, user.organizationId),
      campusScope(user, assignments.campusId),
      ne(assignments.status, "archived"),
      query ? or(like(assignments.title, `%${query}%`), like(assignments.subjectId, `%${query}%`), like(assignments.classId, `%${query}%`)) : undefined,
    )).orderBy(desc(assignments.createdAt)).limit(200);
    rows.forEach((row) => { row.classId = "Class and subject linked"; row.subjectId = "context"; });
      return rows.map((row) => ({ id: row.id, name: row.title, detail: `${row.classId} · ${row.subjectId} · due ${formatIndiaDateTime(row.dueAt)}`, status: row.status }));
  }
  const table = catalogTables[kind];
  const rows = await getDb().select().from(table).where(and(
    scope(user, table),
    query ? or(like(table.name, `%${query}%`), like(table.code, `%${query}%`), like(table.detailsJson, `%${query}%`)) : undefined,
  )).orderBy(desc(table.createdAt)).limit(200);
  const readScope = await academicReadScope(user);
  const visibleRows = readScope === undefined ? rows : rows.filter((row) => catalogRowInScope(row, readScope));
  return visibleRows.map((row) => ({ id: row.id, name: row.name, detail: publicReadableDetail(row.detailsJson, row.code ?? "Academic context configured"), status: row.status }));
}
export async function listSyllabusProgress(user: CurrentUser) {
  const readScope = await academicReadScope(user);
  const rows = await getDb().select({
    id: lessonPlans.id,
    title: lessonPlans.title,
    subjectId: lessonPlans.subjectId,
    subjectName: subjects.name,
    teacherName: users.displayName,
    classId: lessonPlans.classId,
    status: lessonPlans.status,
    updatedAt: lessonPlans.updatedAt,
  }).from(lessonPlans)
    .leftJoin(subjects, and(
      eq(subjects.id, lessonPlans.subjectId),
      eq(subjects.organizationId, user.organizationId),
    ))
    .leftJoin(users, and(
      eq(users.id, lessonPlans.teacherId),
      eq(users.organizationId, user.organizationId),
    ))
    .where(and(
      eq(lessonPlans.organizationId, user.organizationId),
      campusScope(user, lessonPlans.campusId),
      ne(lessonPlans.status, "archived"),
      readScope?.teacherId ? eq(lessonPlans.teacherId, readScope.teacherId) : undefined,
      readScope && readScope.classIds.size
        ? inArray(lessonPlans.classId, [...readScope.classIds])
        : readScope
          ? eq(lessonPlans.classId, "__no_class__")
          : undefined,
    ))
    .orderBy(desc(lessonPlans.updatedAt))
    .limit(1_000);
  const groups = new Map<string, {
    subjectId: string;
    subjectName: string;
    teacherName: string;
    totalLessons: number;
    completedLessons: number;
    lastUpdated: Date;
    lessons: Array<{ id: string; title: string; status: string }>;
  }>();
  for (const row of rows) {
    const key = `${row.subjectId}:${row.teacherName ?? ""}`;
    const group = groups.get(key) ?? {
      subjectId: row.subjectId,
      subjectName: row.subjectName ?? row.subjectId,
      teacherName: row.teacherName ?? "Assigned teacher",
      totalLessons: 0,
      completedLessons: 0,
      lastUpdated: row.updatedAt,
      lessons: [],
    };
    group.totalLessons += 1;
    if (row.status === "completed") group.completedLessons += 1;
    if (row.updatedAt > group.lastUpdated) group.lastUpdated = row.updatedAt;
    group.lessons.push({ id: row.id, title: row.title, status: row.status });
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    pendingLessons: group.totalLessons - group.completedLessons,
    completionPercentage: group.totalLessons
      ? Number(((group.completedLessons / group.totalLessons) * 100).toFixed(1))
      : 0,
    lastUpdated: group.lastUpdated.toISOString(),
  }));
}

export async function updateLessonPlanStatus(
  user: CurrentUser,
  lessonPlanId: string,
  status: "draft" | "in_progress" | "completed",
) {
  const row = await getDb().query.lessonPlans.findFirst({ where: and(
    eq(lessonPlans.id, lessonPlanId),
    eq(lessonPlans.organizationId, user.organizationId),
    campusScope(user, lessonPlans.campusId),
    ne(lessonPlans.status, "archived"),
  ) });
  if (!row) throw new AppError("NOT_FOUND", "Lesson plan not found in your scope.", 404);
  if (user.role === "teacher" && row.teacherId !== user.id) {
    throw new AppError("FORBIDDEN", "Teachers may only update their assigned lesson plans.", 403);
  }
  const [updated] = await getDb().update(lessonPlans).set({
    status,
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(
    eq(lessonPlans.id, lessonPlanId),
    eq(lessonPlans.organizationId, user.organizationId),
  )).returning();
  return updated;
}

export async function createAcademicRecord(user: CurrentUser, input: AcademicRecordInput) {
  const { campusId } = await assertAcademicReferences(user, input);
  if (input.kind === "lesson-plans") {
    if (!input.teacherId || !input.classId || !input.subjectId || !input.scheduledFor) throw new AppError("VALIDATION_ERROR", "Lesson plans require a teacher, class, subject and scheduled date.", 422);
    const [row] = await getDb().insert(lessonPlans).values({
      id: createId("lesson_plan"), organizationId: user.organizationId, campusId,
      teacherId: input.teacherId, classId: input.classId, subjectId: input.subjectId, title: input.name,
      scheduledFor: input.scheduledFor, status: "draft", createdBy: user.id, updatedBy: user.id,
    }).returning();
    if (!row) throw new AppError("DATABASE_ERROR", "Unable to create lesson plan.", 500);
    return row;
  }
  if (input.kind === "assignments") {
    if (!input.teacherId || !input.classId || !input.subjectId || !input.dueAt) throw new AppError("VALIDATION_ERROR", "Assignments require a teacher, class, subject and due date.", 422);
    const [row] = await getDb().insert(assignments).values({
      id: createId("assignment"), organizationId: user.organizationId, campusId,
      teacherId: input.teacherId, classId: input.classId, subjectId: input.subjectId, title: input.name,
      dueAt: input.dueAt,
      detailsJson: input.details ? JSON.stringify({ details: input.details }) : null,
      status: "published", createdBy: user.id, updatedBy: user.id,
    }).returning();
    if (!row) throw new AppError("DATABASE_ERROR", "Unable to create assignment.", 500);
    return row;
  }
  const table = catalogTables[input.kind];
  const [row] = await getDb().insert(table).values({
    id: createId(input.kind.replaceAll("-", "_")), organizationId: user.organizationId, campusId,
    name: input.name, code: input.code ?? null, referenceId: input.referenceId ?? null,
    effectiveAt: input.scheduledFor ?? null, detailsJson: detailFromInput(input), status: "draft",
    createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create academic record.", 500);
  return row;
}

export async function archiveAcademicRecord(user: CurrentUser, kind: AcademicKind, id: string) {
  if (kind === "lesson-plans") {
    const result = await getDb().update(lessonPlans).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(lessonPlans.id, id), eq(lessonPlans.organizationId, user.organizationId), campusScope(user, lessonPlans.campusId))).returning({ id: lessonPlans.id });
    if (!result[0]) throw new AppError("NOT_FOUND", "Lesson plan not found in your scope.", 404);
    return result[0];
  }
  if (kind === "assignments") {
    const result = await getDb().update(assignments).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(assignments.id, id), eq(assignments.organizationId, user.organizationId), campusScope(user, assignments.campusId))).returning({ id: assignments.id });
    if (!result[0]) throw new AppError("NOT_FOUND", "Assignment not found in your scope.", 404);
    return result[0];
  }
  const table = catalogTables[kind];
  const result = await getDb().update(table).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(table.id, id), eq(table.organizationId, user.organizationId), campusScope(user, table.campusId))).returning({ id: table.id });
  if (!result[0]) throw new AppError("NOT_FOUND", "Academic record not found in your scope.", 404);
  return result[0];
}
