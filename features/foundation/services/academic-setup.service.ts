import "server-only";
import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicYears,
  assignments,
  campuses,
  classes,
  sections,
  subjects,
  enrollments,
  exams,
  feeStructures,
  lessonPlans,
  marksEntries,
  studentAttendanceSessions,
  terms,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import type { AcademicSetupArchiveInput, AcademicSetupInput, AcademicSetupKind, AcademicSetupUpdateInput } from "../schemas/academic-setup.schema";

export type AcademicSetupRow = { id: string; name: string; detail: string; status: string; code?: string; startsOn?: Date; endsOn?: Date; isActive?: boolean; classId?: string; sortOrder?: number; capacity?: number; isOptional?: boolean };
export type AcademicSetupOptions = {
  campuses: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string; campusId?: string | null }>;
};

async function assertCampus(user: CurrentUser, campusId: string) {
  const campus = await getDb().query.campuses.findFirst({ where: and(
    eq(campuses.id, campusId),
    eq(campuses.organizationId, user.organizationId),
    eq(campuses.status, "active"),
  ) });
  if (!campus || (user.campusIds?.length && !user.campusIds.includes(campus.id))) {
    throw new AppError("TENANT_SCOPE_ERROR", "Campus is outside your assigned scope.", 403);
  }
  return campus;
}

export async function getAcademicSetupOptions(user: CurrentUser): Promise<AcademicSetupOptions> {
  const campusScope = user.campusIds?.length ? inArray(campuses.id, user.campusIds) : user.campusId ? eq(campuses.id, user.campusId) : undefined;
  const [campusRows, classRows] = await Promise.all([
    getDb().select({ id: campuses.id, name: campuses.name }).from(campuses).where(and(
      eq(campuses.organizationId, user.organizationId),
      campusScope,
      eq(campuses.status, "active"),
    )).orderBy(asc(campuses.name)),
    getDb().select({ id: classes.id, name: classes.name, campusId: classes.campusId }).from(classes).where(and(
      eq(classes.organizationId, user.organizationId),
      user.campusIds?.length ? inArray(classes.campusId, user.campusIds) : user.campusId ? eq(classes.campusId, user.campusId) : undefined,
      eq(classes.status, "active"),
    )).orderBy(asc(classes.sortOrder)),
  ]);
  return { campuses: campusRows, classes: classRows };
}

export async function listAcademicSetup(user: CurrentUser, kind: AcademicSetupKind): Promise<AcademicSetupRow[]> {
  if (kind === "academic_year") {
    const rows = await getDb().select().from(academicYears).where(and(
      eq(academicYears.organizationId, user.organizationId),
      user.campusId ? eq(academicYears.campusId, user.campusId) : undefined,
    )).orderBy(asc(academicYears.startsOn));
    return rows.map((row) => ({ id: row.id, name: row.name, detail: `${row.startsOn.toLocaleDateString()} - ${row.endsOn.toLocaleDateString()}`, status: row.isActive ? "active" : row.status, startsOn: row.startsOn, endsOn: row.endsOn, isActive: row.isActive }));
  }
  if (kind === "class") {
    const rows = await getDb().select().from(classes).where(and(
      eq(classes.organizationId, user.organizationId),
      user.campusId ? eq(classes.campusId, user.campusId) : undefined,
    )).orderBy(asc(classes.sortOrder));
    return rows.map((row) => ({ id: row.id, name: row.name, detail: row.code, status: row.status, code: row.code, sortOrder: row.sortOrder }));
  }
  if (kind === "section") {
    const rows = await getDb().select().from(sections).where(and(
      eq(sections.organizationId, user.organizationId),
      user.campusId ? eq(sections.campusId, user.campusId) : undefined,
    )).orderBy(asc(sections.name));
    return rows.map((row) => ({ id: row.id, name: row.name, detail: `Capacity ${row.capacity}`, status: row.status, capacity: row.capacity, classId: row.classId }));
  }
  const rows = await getDb().select().from(subjects).where(and(
    eq(subjects.organizationId, user.organizationId),
    user.campusId ? eq(subjects.campusId, user.campusId) : undefined,
  )).orderBy(asc(subjects.name));
  return rows.map((row) => ({ id: row.id, name: row.name, detail: `${row.code}${row.isOptional ? " - optional" : ""}`, status: row.status, code: row.code, isOptional: row.isOptional }));
}

export async function createAcademicSetup(user: CurrentUser, input: AcademicSetupInput) {
  await assertCampus(user, input.campusId);
  if (input.kind === "academic_year") {
    return getDb().transaction(async (tx) => {
      if (input.isActive) {
        await tx.update(academicYears).set({
          isActive: false,
          updatedAt: new Date(),
          updatedBy: user.id,
        }).where(and(
          eq(academicYears.organizationId, user.organizationId),
          eq(academicYears.isActive, true),
        ));
      }
      const [row] = await tx.insert(academicYears).values({
        organizationId: user.organizationId,
        campusId: input.campusId,
        name: input.name,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        isActive: input.isActive,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();
      return row;
    });
  }
  if (input.kind === "class") {
    const [row] = await getDb().insert(classes).values({
      organizationId: user.organizationId,
      campusId: input.campusId,
      name: input.name,
      code: input.code,
      sortOrder: input.sortOrder,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    return row;
  }
  if (input.kind === "section") {
    const classRow = await getDb().query.classes.findFirst({ where: and(
      eq(classes.id, input.classId),
      eq(classes.organizationId, user.organizationId),
      eq(classes.campusId, input.campusId),
      eq(classes.status, "active"),
    ) });
    if (!classRow) throw new AppError("VALIDATION_ERROR", "Class is outside the selected campus.", 422);
    const [row] = await getDb().insert(sections).values({
      organizationId: user.organizationId,
      campusId: input.campusId,
      classId: input.classId,
      name: input.name,
      capacity: input.capacity,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    return row;
  }
  const [row] = await getDb().insert(subjects).values({
    organizationId: user.organizationId,
    campusId: input.campusId,
    name: input.name,
    code: input.code,
    isOptional: input.isOptional,
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  return row;
}

async function getSetupRecord(user: CurrentUser, kind: AcademicSetupKind, id: string) {
  const row = kind === "academic_year"
    ? await getDb().query.academicYears.findFirst({ where: and(eq(academicYears.id, id), eq(academicYears.organizationId, user.organizationId)) })
    : kind === "class"
      ? await getDb().query.classes.findFirst({ where: and(eq(classes.id, id), eq(classes.organizationId, user.organizationId)) })
      : kind === "section"
        ? await getDb().query.sections.findFirst({ where: and(eq(sections.id, id), eq(sections.organizationId, user.organizationId)) })
        : await getDb().query.subjects.findFirst({ where: and(eq(subjects.id, id), eq(subjects.organizationId, user.organizationId)) });
  if (!row) throw new AppError("NOT_FOUND", `${kind.replaceAll("_", " ")} not found.`, 404);
  if (row.campusId && user.campusIds?.length && !user.campusIds.includes(row.campusId)) throw new AppError("FORBIDDEN", "Record is outside your campus scope.", 403);
  return row;
}

export async function updateAcademicSetup(user: CurrentUser, input: AcademicSetupUpdateInput) {
  const existing = await getSetupRecord(user, input.kind, input.id);
  if (existing.status === "archived") throw new AppError("CONFLICT", "Archived setup records cannot be edited.", 409);
  return getDb().transaction(async (tx) => {
    const now = new Date();
    if (input.kind === "academic_year") {
      if (input.isActive) await tx.update(academicYears).set({ isActive: false, updatedAt: now, updatedBy: user.id }).where(and(eq(academicYears.organizationId, user.organizationId), ne(academicYears.id, input.id), eq(academicYears.isActive, true)));
      const [row] = await tx.update(academicYears).set({ name: input.name, startsOn: input.startsOn, endsOn: input.endsOn, isActive: input.isActive, updatedAt: now, updatedBy: user.id }).where(and(eq(academicYears.id, input.id), eq(academicYears.organizationId, user.organizationId))).returning();
      return row;
    }
    if (input.kind === "class") {
      const [row] = await tx.update(classes).set({ name: input.name, code: input.code, sortOrder: input.sortOrder, updatedAt: now, updatedBy: user.id }).where(and(eq(classes.id, input.id), eq(classes.organizationId, user.organizationId))).returning();
      return row;
    }
    if (input.kind === "section") {
      const [row] = await tx.update(sections).set({ name: input.name, capacity: input.capacity, updatedAt: now, updatedBy: user.id }).where(and(eq(sections.id, input.id), eq(sections.organizationId, user.organizationId))).returning();
      return row;
    }
    const [row] = await tx.update(subjects).set({ name: input.name, code: input.code, isOptional: input.isOptional, updatedAt: now, updatedBy: user.id }).where(and(eq(subjects.id, input.id), eq(subjects.organizationId, user.organizationId))).returning();
    return row;
  });
}

export async function archiveAcademicSetup(user: CurrentUser, input: AcademicSetupArchiveInput) {
  const existing = await getSetupRecord(user, input.kind, input.id);
  if (existing.status === "archived") return existing;
  const activeDependencies: string[] = [];
  if (input.kind === "academic_year") {
    const [termRows, enrollmentRows, examRows, feeRows] = await Promise.all([
      getDb().select({ value: count() }).from(terms).where(and(eq(terms.organizationId, user.organizationId), eq(terms.academicYearId, input.id), ne(terms.status, "archived"))),
      getDb().select({ value: count() }).from(enrollments).where(and(eq(enrollments.organizationId, user.organizationId), eq(enrollments.academicYearId, input.id), eq(enrollments.status, "active"))),
      getDb().select({ value: count() }).from(exams).where(and(eq(exams.organizationId, user.organizationId), eq(exams.academicYearId, input.id), ne(exams.status, "archived"))),
      getDb().select({ value: count() }).from(feeStructures).where(and(eq(feeStructures.organizationId, user.organizationId), eq(feeStructures.academicYearId, input.id), ne(feeStructures.status, "archived"))),
    ]);
    if ((termRows[0]?.value ?? 0) > 0) activeDependencies.push("terms");
    if ((enrollmentRows[0]?.value ?? 0) > 0) activeDependencies.push("enrollments");
    if ((examRows[0]?.value ?? 0) > 0) activeDependencies.push("exams");
    if ((feeRows[0]?.value ?? 0) > 0) activeDependencies.push("fee structures");
  } else if (input.kind === "class") {
    const [sectionRows, enrollmentRows] = await Promise.all([
      getDb().select({ value: count() }).from(sections).where(and(eq(sections.organizationId, user.organizationId), eq(sections.classId, input.id), ne(sections.status, "archived"))),
      getDb().select({ value: count() }).from(enrollments).where(and(eq(enrollments.organizationId, user.organizationId), eq(enrollments.classId, input.id), eq(enrollments.status, "active"))),
    ]);
    if ((sectionRows[0]?.value ?? 0) > 0) activeDependencies.push("sections");
    if ((enrollmentRows[0]?.value ?? 0) > 0) activeDependencies.push("enrollments");
  } else if (input.kind === "section") {
    const [enrollmentRows, attendanceRows] = await Promise.all([
      getDb().select({ value: count() }).from(enrollments).where(and(eq(enrollments.organizationId, user.organizationId), eq(enrollments.sectionId, input.id), eq(enrollments.status, "active"))),
      getDb().select({ value: count() }).from(studentAttendanceSessions).where(and(eq(studentAttendanceSessions.organizationId, user.organizationId), eq(studentAttendanceSessions.sectionId, input.id), ne(studentAttendanceSessions.status, "archived"))),
    ]);
    if ((enrollmentRows[0]?.value ?? 0) > 0) activeDependencies.push("enrollments");
    if ((attendanceRows[0]?.value ?? 0) > 0) activeDependencies.push("attendance sessions");
  } else {
    const [marksRows, lessonRows, assignmentRows] = await Promise.all([
      getDb().select({ value: count() }).from(marksEntries).where(and(eq(marksEntries.organizationId, user.organizationId), eq(marksEntries.subjectId, input.id), ne(marksEntries.status, "archived"))),
      getDb().select({ value: count() }).from(lessonPlans).where(and(eq(lessonPlans.organizationId, user.organizationId), eq(lessonPlans.subjectId, input.id), ne(lessonPlans.status, "archived"))),
      getDb().select({ value: count() }).from(assignments).where(and(eq(assignments.organizationId, user.organizationId), eq(assignments.subjectId, input.id), ne(assignments.status, "archived"))),
    ]);
    if ((marksRows[0]?.value ?? 0) > 0) activeDependencies.push("marks");
    if ((lessonRows[0]?.value ?? 0) > 0) activeDependencies.push("lesson plans");
    if ((assignmentRows[0]?.value ?? 0) > 0) activeDependencies.push("assignments");
  }
  if (activeDependencies.length) throw new AppError("CONFLICT", `Archive dependencies first: ${activeDependencies.join(", ")}.`, 409);
  const now = new Date();
  if (input.kind === "academic_year") {
    const [row] = await getDb().update(academicYears).set({ status: "archived", isActive: false, updatedAt: now, updatedBy: user.id }).where(and(eq(academicYears.id, input.id), eq(academicYears.organizationId, user.organizationId))).returning();
    return row;
  }
  if (input.kind === "class") {
    const [row] = await getDb().update(classes).set({ status: "archived", updatedAt: now, updatedBy: user.id }).where(and(eq(classes.id, input.id), eq(classes.organizationId, user.organizationId))).returning();
    return row;
  }
  if (input.kind === "section") {
    const [row] = await getDb().update(sections).set({ status: "archived", updatedAt: now, updatedBy: user.id }).where(and(eq(sections.id, input.id), eq(sections.organizationId, user.organizationId))).returning();
    return row;
  }
  const [row] = await getDb().update(subjects).set({ status: "archived", updatedAt: now, updatedBy: user.id }).where(and(eq(subjects.id, input.id), eq(subjects.organizationId, user.organizationId))).returning();
  return row;
}
