import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { disciplineIncidents, students } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { hasPermission } from "@/lib/rbac/permissions";
import { resolvePermittedStudentIds } from "@/features/students/services/students.service";
import type { CurrentUser } from "@/lib/auth/types";
import type { DisciplineIncidentInput } from "../schemas/discipline.schema";
import { formatIndiaDateTime } from "@/lib/utils/india-time";

function canViewSensitive(user: CurrentUser) {
  return hasPermission(user, "students:view_sensitive") || hasPermission(user, "safety:read") || hasPermission(user, "safety:view_sensitive");
}

export async function createDisciplineIncident(user: CurrentUser, input: DisciplineIncidentInput) {
  if (!canViewSensitive(user)) throw new AppError("FORBIDDEN", "Sensitive discipline records require the safety or sensitive-student permission.", 403);
  const student = await getDb().query.students.findFirst({ where: and(
    eq(students.id, input.studentId),
    eq(students.organizationId, user.organizationId),
    user.campusId ? eq(students.campusId, user.campusId) : undefined,
    eq(students.status, "active"),
  ) });
  if (!student) throw new AppError("NOT_FOUND", "Student not found in your campus scope.", 404);
  const [row] = await getDb().insert(disciplineIncidents).values({
    organizationId: user.organizationId,
    campusId: student.campusId,
    studentId: student.id,
    severity: input.severity,
    title: input.title,
    details: input.details || undefined,
    confidential: input.confidential,
    occurredAt: input.occurredAt,
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  return row;
}

export async function listDisciplineIncidents(user: CurrentUser) {
  if (!canViewSensitive(user)) return [];
  const rows = await getDb().select({
    id: disciplineIncidents.id,
    studentId: disciplineIncidents.studentId,
    firstName: students.firstName,
    lastName: students.lastName,
    severity: disciplineIncidents.severity,
    title: disciplineIncidents.title,
    details: disciplineIncidents.details,
    confidential: disciplineIncidents.confidential,
    occurredAt: disciplineIncidents.occurredAt,
    status: disciplineIncidents.status,
  }).from(disciplineIncidents).innerJoin(students, and(
    eq(students.id, disciplineIncidents.studentId),
    eq(students.organizationId, user.organizationId),
  )).where(and(
    eq(disciplineIncidents.organizationId, user.organizationId),
    user.campusId ? eq(disciplineIncidents.campusId, user.campusId) : undefined,
  )).orderBy(desc(disciplineIncidents.occurredAt)).limit(100);
  return rows.map((row) => ({ ...row, student: `${row.firstName} ${row.lastName}`, occurredAt: formatIndiaDateTime(row.occurredAt) }));
}

export async function listStudentDisciplineIncidents(
  user: CurrentUser,
  studentId: string,
) {
  const permittedIds = await resolvePermittedStudentIds(user);
  if (permittedIds && !permittedIds.includes(studentId)) {
    throw new AppError("FORBIDDEN", "This discipline timeline is outside your linked student scope.", 403);
  }
  const guardianView = user.role === "parent" || user.role === "student";
  const rows = await getDb().select({
    id: disciplineIncidents.id,
    severity: disciplineIncidents.severity,
    title: disciplineIncidents.title,
    details: disciplineIncidents.details,
    confidential: disciplineIncidents.confidential,
    occurredAt: disciplineIncidents.occurredAt,
    status: disciplineIncidents.status,
  }).from(disciplineIncidents).where(and(
    eq(disciplineIncidents.organizationId, user.organizationId),
    eq(disciplineIncidents.studentId, studentId),
    user.campusIds?.length
      ? inArray(disciplineIncidents.campusId, user.campusIds)
      : user.campusId
        ? eq(disciplineIncidents.campusId, user.campusId)
        : undefined,
    guardianView ? eq(disciplineIncidents.confidential, false) : undefined,
  )).orderBy(desc(disciplineIncidents.occurredAt)).limit(100);
  return rows.map((row) => ({
    ...row,
    studentId,
    student: "",
    details: row.details ?? undefined,
    occurredAt: formatIndiaDateTime(row.occurredAt),
  }));
}

export async function updateDisciplineStatus(user: CurrentUser, incidentId: string, status: "open" | "resolved" | "dismissed") {
  if (!canViewSensitive(user)) throw new AppError("FORBIDDEN", "Sensitive discipline records require the safety or sensitive-student permission.", 403);
  const [row] = await getDb().update(disciplineIncidents).set({ status, updatedAt: new Date(), updatedBy: user.id }).where(and(
    eq(disciplineIncidents.id, incidentId),
    eq(disciplineIncidents.organizationId, user.organizationId),
    user.campusId ? eq(disciplineIncidents.campusId, user.campusId) : undefined,
  )).returning();
  if (!row) throw new AppError("NOT_FOUND", "Discipline incident not found.", 404);
  return row;
}
