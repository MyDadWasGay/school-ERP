import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clinicVisits, healthProfiles, students } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { ClinicVisitInput, HealthProfileInput } from "../schemas/health.schema";

function campusScope(user: CurrentUser, column: Parameters<typeof eq>[0]) {
  if (user.campusIds && user.campusIds.length > 0) return inArray(column, user.campusIds);
  return user.campusId ? eq(column, user.campusId) : undefined;
}

async function assertStudent(user: CurrentUser, studentId: string) {
  const student = await getDb().query.students.findFirst({ where: and(
    eq(students.id, studentId),
    eq(students.organizationId, user.organizationId),
    campusScope(user, students.campusId),
    eq(students.status, "active"),
  ) });
  if (!student) throw new AppError("NOT_FOUND", "Student is outside your health-data scope.", 404);
  return student;
}

export async function listHealthStudents(user: CurrentUser) {
  const rows = await getDb().select({ id: students.id, name: sql<string>`${students.firstName} || ' ' || ${students.lastName}` }).from(students).where(and(
    eq(students.organizationId, user.organizationId),
    campusScope(user, students.campusId),
    eq(students.status, "active"),
  )).orderBy(asc(students.firstName), asc(students.lastName)).limit(500);
  return rows;
}

export async function listHealthProfiles(user: CurrentUser) {
  return getDb().select({
    id: healthProfiles.id,
    studentId: healthProfiles.studentId,
    studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
    allergies: healthProfiles.allergies,
    conditions: healthProfiles.conditions,
    updatedAt: healthProfiles.updatedAt,
  }).from(healthProfiles).innerJoin(students, and(
    eq(students.id, healthProfiles.studentId),
    eq(students.organizationId, user.organizationId),
  )).where(and(
    eq(healthProfiles.organizationId, user.organizationId),
    campusScope(user, healthProfiles.campusId),
    eq(healthProfiles.status, "active"),
  )).orderBy(desc(healthProfiles.updatedAt)).limit(500);
}

export async function upsertHealthProfile(user: CurrentUser, input: HealthProfileInput) {
  const student = await assertStudent(user, input.studentId);
  const existing = await getDb().query.healthProfiles.findFirst({ where: and(
    eq(healthProfiles.organizationId, user.organizationId),
    eq(healthProfiles.studentId, student.id),
    eq(healthProfiles.status, "active"),
  ) });
  if (existing) {
    const [updated] = await getDb().update(healthProfiles).set({ allergies: input.allergies || null, conditions: input.conditions || null, updatedAt: new Date(), updatedBy: user.id }).where(eq(healthProfiles.id, existing.id)).returning();
    if (!updated) throw new AppError("DATABASE_ERROR", "Unable to update health profile.", 500);
    return updated;
  }
  const [row] = await getDb().insert(healthProfiles).values({
    id: createId("health_profile"),
    organizationId: user.organizationId,
    campusId: student.campusId,
    studentId: student.id,
    allergies: input.allergies || null,
    conditions: input.conditions || null,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create health profile.", 500);
  return row;
}

export async function listClinicVisits(user: CurrentUser) {
  return getDb().select({
    id: clinicVisits.id,
    studentId: clinicVisits.studentId,
    studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
    visitedAt: clinicVisits.visitedAt,
    summary: clinicVisits.summary,
    status: clinicVisits.status,
  }).from(clinicVisits).innerJoin(students, and(eq(students.id, clinicVisits.studentId), eq(students.organizationId, user.organizationId))).where(and(
    eq(clinicVisits.organizationId, user.organizationId),
    campusScope(user, clinicVisits.campusId),
  )).orderBy(desc(clinicVisits.visitedAt)).limit(500);
}

export async function createClinicVisit(user: CurrentUser, input: ClinicVisitInput) {
  const student = await assertStudent(user, input.studentId);
  const [row] = await getDb().insert(clinicVisits).values({
    id: createId("clinic_visit"),
    organizationId: user.organizationId,
    campusId: student.campusId,
    studentId: student.id,
    visitedAt: input.visitedAt,
    summary: input.summary,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to record clinic visit.", 500);
  return row;
}
