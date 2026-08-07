import "server-only";
import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { academicYears, campuses, classes, organizations, students, userCampusScopes, users } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import type { CampusArchiveInput, CampusInput, CampusUpdateInput, OrganizationInput } from "../schemas/organization.schema";

export async function listOrganizations(user: CurrentUser) {
  const rows = await getDb().select().from(organizations).where(
    eq(organizations.id, user.organizationId),
  ).orderBy(asc(organizations.name)).limit(100);
  return rows.map((row) => ({ id: row.id, name: row.name, detail: row.slug, status: row.status }));
}

export async function listCampuses(user: CurrentUser) {
  const campusScope = user.campusIds?.length ? inArray(campuses.id, user.campusIds) : undefined;
  const rows = await getDb().select().from(campuses).where(and(
    eq(campuses.organizationId, user.organizationId),
    campusScope,
  )).orderBy(asc(campuses.name)).limit(100);
  return rows.map((row) => ({ id: row.id, name: row.name, detail: row.code, status: row.status }));
}

export async function createOrganization(user: CurrentUser, input: OrganizationInput) {
  void user;
  void input;
  throw new AppError("FORBIDDEN", "Use the platform school provisioning workflow.", 403);
}

export async function createCampus(user: CurrentUser, input: CampusInput) {
  const [row] = await getDb().insert(campuses).values({
    ...input, organizationId: user.organizationId, createdBy: user.id, updatedBy: user.id,
  }).returning();
  return row;
}

export async function updateCampus(user: CurrentUser, input: CampusUpdateInput) {
  const existing = await getDb().query.campuses.findFirst({ where: and(eq(campuses.id, input.id), eq(campuses.organizationId, user.organizationId)) });
  if (!existing) throw new AppError("NOT_FOUND", "Campus not found.", 404);
  if (user.campusIds?.length && !user.campusIds.includes(existing.id)) throw new AppError("FORBIDDEN", "Campus is outside your assigned scope.", 403);
  if (existing.status === "archived") throw new AppError("CONFLICT", "Archived campuses cannot be edited.", 409);
  const [row] = await getDb().update(campuses).set({ name: input.name, code: input.code, address: input.address || null, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(campuses.id, existing.id), eq(campuses.organizationId, user.organizationId))).returning();
  return { before: existing, updated: row };
}

export async function archiveCampus(user: CurrentUser, input: CampusArchiveInput) {
  const existing = await getDb().query.campuses.findFirst({ where: and(eq(campuses.id, input.id), eq(campuses.organizationId, user.organizationId)) });
  if (!existing) throw new AppError("NOT_FOUND", "Campus not found.", 404);
  if (user.campusIds?.length && !user.campusIds.includes(existing.id)) throw new AppError("FORBIDDEN", "Campus is outside your assigned scope.", 403);
  if (existing.status === "archived") return existing;
  const [yearRows, classRows, studentRows, userRows] = await Promise.all([
    getDb().select({ value: count() }).from(academicYears).where(and(eq(academicYears.organizationId, user.organizationId), eq(academicYears.campusId, existing.id), ne(academicYears.status, "archived"))),
    getDb().select({ value: count() }).from(classes).where(and(eq(classes.organizationId, user.organizationId), eq(classes.campusId, existing.id), ne(classes.status, "archived"))),
    getDb().select({ value: count() }).from(students).where(and(eq(students.organizationId, user.organizationId), eq(students.campusId, existing.id), eq(students.status, "active"))),
    getDb().select({ value: count() }).from(userCampusScopes).innerJoin(users, and(eq(users.id, userCampusScopes.userId), eq(users.organizationId, user.organizationId))).where(and(eq(userCampusScopes.organizationId, user.organizationId), eq(userCampusScopes.campusId, existing.id), eq(users.status, "active"))),
  ]);
  const dependencies = [["academic years", yearRows[0]?.value ?? 0], ["classes", classRows[0]?.value ?? 0], ["active students", studentRows[0]?.value ?? 0], ["active user scopes", userRows[0]?.value ?? 0]].filter(([, value]) => typeof value === "number" && value > 0).map(([name]) => name);
  if (dependencies.length) throw new AppError("CONFLICT", `Archive dependencies first: ${dependencies.join(", ")}.`, 409);
  const [row] = await getDb().update(campuses).set({ status: "archived", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(campuses.id, existing.id), eq(campuses.organizationId, user.organizationId))).returning();
  return row;
}
