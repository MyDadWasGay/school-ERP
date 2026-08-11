import { and, asc, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  campuses,
  classes,
  delegatedAccess,
  loginAudits,
  sections,
  sessionLogs,
  userCampusScopes,
  userClassSectionScopes,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin-core";
import { AppError } from "@/lib/errors/app-error";
import { normalizePagination } from "@/lib/utils/pagination";
import type {
  DelegationCreateInput,
  DelegationRevokeInput,
  UserAccessUpdateInput,
} from "../schemas/user-access.schema";

export async function listUsersPage(
  actor: CurrentUser,
  input?: { page?: number; pageSize?: number; search?: string },
) {
  const pagination = normalizePagination(input);
  const search = input?.search?.trim();
  const scopedUserIds = actor.campusId
    ? getDb().select({ userId: userCampusScopes.userId }).from(userCampusScopes).where(and(
      eq(userCampusScopes.organizationId, actor.organizationId),
      eq(userCampusScopes.campusId, actor.campusId),
    ))
    : undefined;
  const where = and(
    eq(users.organizationId, actor.organizationId),
    scopedUserIds ? inArray(users.id, scopedUserIds) : undefined,
    search ? or(
      like(users.displayName, `%${search}%`),
      like(users.email, `%${search}%`),
    ) : undefined,
  );
  const [campusOptions, rows, totals] = await Promise.all([
    getDb().select({ id: campuses.id, name: campuses.name }).from(campuses).where(and(
      eq(campuses.organizationId, actor.organizationId),
      actor.campusId ? eq(campuses.id, actor.campusId) : undefined,
      eq(campuses.status, "active"),
    )).orderBy(asc(campuses.name)),
    getDb().select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      status: users.status,
    }).from(users).where(where).orderBy(asc(users.displayName))
      .limit(pagination.pageSize).offset(pagination.offset),
    getDb().select({ value: count() }).from(users).where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    rows,
    campusOptions,
    pageInfo: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pageCount: Math.ceil(total / pagination.pageSize),
    },
  };
}

export async function getUserAccessDetail(actor: CurrentUser, userId: string) {
  const user = await getDb().query.users.findFirst({ where: and(
    eq(users.id, userId),
    eq(users.organizationId, actor.organizationId),
  ) });
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);
  const actorCampusIds = hasPermission(actor, "organizations:update") ? undefined : actor.campusIds;
  if (actorCampusIds?.length) {
    const visibleScope = await getDb().query.userCampusScopes.findFirst({ where: and(
      eq(userCampusScopes.organizationId, actor.organizationId),
      eq(userCampusScopes.userId, user.id),
      inArray(userCampusScopes.campusId, actorCampusIds),
    ) });
    if (!visibleScope) throw new AppError("FORBIDDEN", "User is outside your assigned campus scope.", 403);
  }
  const [
    campusOptions,
    classSectionOptions,
    campusScopeRows,
    classScopeRows,
    delegations,
    loginHistory,
  ] = await Promise.all([
    getDb().select({ id: campuses.id, name: campuses.name }).from(campuses).where(and(
      eq(campuses.organizationId, actor.organizationId),
      actorCampusIds?.length ? inArray(campuses.id, actorCampusIds) : undefined,
      eq(campuses.status, "active"),
    )).orderBy(asc(campuses.name)),
    getDb().select({
      classId: classes.id,
      sectionId: sections.id,
      className: classes.name,
      sectionName: sections.name,
      campusId: classes.campusId,
    }).from(sections).innerJoin(classes, and(
      eq(classes.id, sections.classId),
      eq(classes.organizationId, actor.organizationId),
    )).where(and(
      eq(sections.organizationId, actor.organizationId),
      actorCampusIds?.length ? inArray(classes.campusId, actorCampusIds) : undefined,
      eq(sections.status, "active"),
      eq(classes.status, "active"),
    )).orderBy(asc(classes.sortOrder), asc(sections.name)),
    getDb().select({ campusId: userCampusScopes.campusId }).from(userCampusScopes).where(and(
      eq(userCampusScopes.organizationId, actor.organizationId),
      eq(userCampusScopes.userId, user.id),
    )),
    getDb().select({
      classId: userClassSectionScopes.classId,
      sectionId: userClassSectionScopes.sectionId,
    }).from(userClassSectionScopes).where(and(
      eq(userClassSectionScopes.organizationId, actor.organizationId),
      eq(userClassSectionScopes.userId, user.id),
    )),
    getDb().select().from(delegatedAccess).where(and(
      eq(delegatedAccess.organizationId, actor.organizationId),
      eq(delegatedAccess.userId, user.id),
    )).orderBy(desc(delegatedAccess.createdAt)).limit(50),
    getDb().select().from(loginAudits).where(and(
      eq(loginAudits.organizationId, actor.organizationId),
      eq(loginAudits.userId, user.id),
    )).orderBy(desc(loginAudits.createdAt)).limit(50),
  ]);
  return {
    user,
    campusOptions,
    classSectionOptions: classSectionOptions.map((row) => ({
      classId: row.classId,
      sectionId: row.sectionId,
      name: `${row.className} - ${row.sectionName}`,
      campusId: row.campusId,
    })),
    campusIds: campusScopeRows.map((row) => row.campusId),
    classSectionScopes: classScopeRows,
    delegations,
    loginHistory,
  };
}

async function assertAccessOptions(actor: CurrentUser, input: UserAccessUpdateInput) {
  const uniqueCampusIds = [...new Set(input.campusIds)];
  const campusRows = await getDb().select({ id: campuses.id }).from(campuses).where(and(
    eq(campuses.organizationId, actor.organizationId),
    eq(campuses.status, "active"),
    !hasPermission(actor, "organizations:update") && actor.campusIds?.length
      ? inArray(campuses.id, actor.campusIds)
      : undefined,
    inArray(campuses.id, uniqueCampusIds),
  ));
  if (campusRows.length !== uniqueCampusIds.length) {
    throw new AppError("TENANT_SCOPE_ERROR", "One or more campuses are outside this organization.", 403);
  }
  if (input.classSectionScopes.length === 0) return;
  const classIds = [...new Set(input.classSectionScopes.map((scope) => scope.classId))];
  const sectionIds = [...new Set(input.classSectionScopes.map((scope) => scope.sectionId))];
  const validRows = await getDb().select({
    classId: classes.id,
    sectionId: sections.id,
    campusId: classes.campusId,
  }).from(sections).innerJoin(classes, and(
    eq(classes.id, sections.classId),
    eq(classes.organizationId, actor.organizationId),
  )).where(and(
    eq(sections.organizationId, actor.organizationId),
    inArray(classes.id, classIds),
    inArray(sections.id, sectionIds),
  ));
  const valid = new Set(validRows
    .filter((row) => row.campusId && uniqueCampusIds.includes(row.campusId))
    .map((row) => `${row.classId}:${row.sectionId}`));
  if (input.classSectionScopes.some((scope) => !valid.has(`${scope.classId}:${scope.sectionId}`))) {
    throw new AppError("TENANT_SCOPE_ERROR", "A class scope is outside the selected campus access.", 403);
  }
}

export async function updateUserAccess(actor: CurrentUser, input: UserAccessUpdateInput) {
  const existing = await getDb().query.users.findFirst({ where: and(
    eq(users.id, input.id),
    eq(users.organizationId, actor.organizationId),
  ) });
  if (!existing) throw new AppError("NOT_FOUND", "User not found.", 404);
  if ((existing.role === "super_admin" || input.role === "super_admin") && !hasPermission(actor, "organizations:update")) {
    throw new AppError("FORBIDDEN", "Only a super administrator can change a super administrator account.", 403);
  }
  if (existing.id === actor.id && input.status !== "active") {
    throw new AppError("CONFLICT", "You cannot suspend your own active session.", 409);
  }
  await assertAccessOptions(actor, input);
  const auth = getFirebaseAdminAuth();
  if (!auth) throw new AppError("CONFIGURATION_ERROR", "Firebase Admin is required to update user access.", 503);
  await auth.updateUser(existing.firebaseUid, {
    displayName: input.displayName,
    disabled: input.status !== "active",
  });
  try {
    return await getDb().transaction(async (tx) => {
      const [updated] = await tx.update(users).set({
        displayName: input.displayName,
        role: input.role,
        status: input.status,
        campusId: input.primaryCampusId,
        updatedAt: new Date(),
        updatedBy: actor.id,
      }).where(and(eq(users.id, existing.id), eq(users.organizationId, actor.organizationId))).returning();
      await tx.delete(userCampusScopes).where(and(
        eq(userCampusScopes.organizationId, actor.organizationId),
        eq(userCampusScopes.userId, existing.id),
      ));
      await tx.insert(userCampusScopes).values([...new Set(input.campusIds)].map((campusId) => ({
        organizationId: actor.organizationId,
        userId: existing.id,
        campusId,
        createdBy: actor.id,
        updatedBy: actor.id,
      })));
      await tx.delete(userClassSectionScopes).where(and(
        eq(userClassSectionScopes.organizationId, actor.organizationId),
        eq(userClassSectionScopes.userId, existing.id),
      ));
      if (input.classSectionScopes.length) {
        await tx.insert(userClassSectionScopes).values(input.classSectionScopes.map((scope) => ({
          organizationId: actor.organizationId,
          userId: existing.id,
          classId: scope.classId,
          sectionId: scope.sectionId,
          createdBy: actor.id,
          updatedBy: actor.id,
        })));
      }
      const now = new Date();
      await tx.update(sessionLogs).set({
        status: "revoked",
        revokedAt: now,
        updatedAt: now,
        updatedBy: actor.id,
      }).where(and(
        eq(sessionLogs.organizationId, actor.organizationId),
        eq(sessionLogs.userId, existing.id),
        eq(sessionLogs.status, "active"),
      ));
      return { before: existing, updated };
    });
  } catch (error) {
    await auth.updateUser(existing.firebaseUid, {
      displayName: existing.displayName,
      disabled: existing.status !== "active",
    }).catch(() => undefined);
    throw error;
  }
}

export async function createDelegation(actor: CurrentUser, input: DelegationCreateInput) {
  const target = await getDb().query.users.findFirst({ where: and(
    eq(users.id, input.userId),
    eq(users.organizationId, actor.organizationId),
    eq(users.status, "active"),
  ) });
  if (!target) throw new AppError("NOT_FOUND", "Active user not found.", 404);
  if (input.campusId) {
    if (!hasPermission(actor, "organizations:update") && actor.campusIds?.length && !actor.campusIds.includes(input.campusId)) {
      throw new AppError("TENANT_SCOPE_ERROR", "Campus is outside your assigned scope.", 403);
    }
    const campus = await getDb().query.campuses.findFirst({ where: and(
      eq(campuses.id, input.campusId),
      eq(campuses.organizationId, actor.organizationId),
      eq(campuses.status, "active"),
    ) });
    if (!campus) throw new AppError("TENANT_SCOPE_ERROR", "Campus is outside this organization.", 403);
  }
  const [row] = await getDb().insert(delegatedAccess).values({
    organizationId: actor.organizationId,
    campusId: input.campusId || null,
    userId: target.id,
    permissionKey: input.permissionKey,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    grantedBy: actor.id,
    createdBy: actor.id,
    updatedBy: actor.id,
  }).returning();
  return row;
}

export async function revokeDelegation(actor: CurrentUser, input: DelegationRevokeInput) {
  const existing = await getDb().query.delegatedAccess.findFirst({ where: and(
    eq(delegatedAccess.id, input.id),
    eq(delegatedAccess.organizationId, actor.organizationId),
    eq(delegatedAccess.userId, input.userId),
  ) });
  if (!existing) throw new AppError("NOT_FOUND", "Delegated access record not found.", 404);
  const [updated] = await getDb().update(delegatedAccess).set({
    status: "revoked",
    updatedAt: new Date(),
    updatedBy: actor.id,
  }).where(and(
    eq(delegatedAccess.id, existing.id),
    eq(delegatedAccess.organizationId, actor.organizationId),
  )).returning();
  return { before: existing, updated };
}
