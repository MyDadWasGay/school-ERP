import "server-only";
import { and, eq, gt, gte, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  delegatedAccess,
  campuses,
  organizations,
  permissions,
  rolePermissions,
  roles,
  sessionLogs,
  userCampusScopes,
  userClassSectionScopes,
  users,
} from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { checkPermission } from "@/lib/rbac/check-permission";
import { rolePermissionDefaults } from "@/config/permissions";
import type { CurrentUser } from "./types";
import { readActiveCampusId, readSessionIdentity } from "./session";
import { SUPPORTED_ROLES } from "@/config/constants";

export async function getUserByFirebaseUid(uid: string, selectedCampusId?: string): Promise<CurrentUser | null> {
  const row = await getDb().query.users.findFirst({ where: eq(users.firebaseUid, uid) });
  if (!row || row.status !== "active") return null;
  if (!SUPPORTED_ROLES.includes(row.role as (typeof SUPPORTED_ROLES)[number])) return null;
  const organization = await getDb().query.organizations.findFirst({ where: and(
    eq(organizations.id, row.organizationId),
    eq(organizations.status, "active"),
  ) });
  if (!organization) return null;
  const now = new Date();
  const [campusRows, classRows, persistedPermissions] = await Promise.all([
    getDb().select({ campusId: userCampusScopes.campusId, campusName: campuses.name }).from(userCampusScopes)
      .innerJoin(campuses, and(
        eq(campuses.id, userCampusScopes.campusId),
        eq(campuses.organizationId, row.organizationId),
        eq(campuses.status, "active"),
      )).where(and(
      eq(userCampusScopes.organizationId, row.organizationId),
      eq(userCampusScopes.userId, row.id),
    )),
    getDb().select({ classId: userClassSectionScopes.classId, sectionId: userClassSectionScopes.sectionId }).from(userClassSectionScopes).where(and(
      eq(userClassSectionScopes.organizationId, row.organizationId),
      eq(userClassSectionScopes.userId, row.id),
    )),
    getDb().select({ key: permissions.key }).from(permissions)
      .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .where(and(eq(rolePermissions.organizationId, row.organizationId), eq(roles.organizationId, row.organizationId), eq(roles.key, row.role), eq(roles.status, "active"))),
  ]);
  const availableCampuses = [...new Map(campusRows.map(({ campusId, campusName }) => [campusId, { id: campusId, name: campusName }])).values()];
  if (row.campusId && !availableCampuses.some(({ id }) => id === row.campusId)) {
    const primaryCampus = await getDb().query.campuses.findFirst({ where: and(
      eq(campuses.id, row.campusId),
      eq(campuses.organizationId, row.organizationId),
      eq(campuses.status, "active"),
    ) });
    if (primaryCampus) availableCampuses.unshift({ id: primaryCampus.id, name: primaryCampus.name });
  }
  const campusIds = availableCampuses.map(({ id }) => id);
  const activeCampus = availableCampuses.find(({ id }) => id === selectedCampusId)
    ?? availableCampuses.find(({ id }) => id === row.campusId)
    ?? availableCampuses[0];
  const delegatedPermissions = await getDb().select({ key: delegatedAccess.permissionKey }).from(delegatedAccess).where(and(
    eq(delegatedAccess.organizationId, row.organizationId),
    eq(delegatedAccess.userId, row.id),
    eq(delegatedAccess.status, "active"),
    lte(delegatedAccess.startsAt, now),
    gte(delegatedAccess.endsAt, now),
    or(isNull(delegatedAccess.campusId), activeCampus ? eq(delegatedAccess.campusId, activeCampus.id) : undefined),
  ));
  const activeDelegations = delegatedPermissions.map(({ key }) => key);
  const rolePermissionsFromDb = persistedPermissions.map(({ key }) => key);
  const effectivePermissions = rolePermissionsFromDb.length > 0
    ? [...new Set([...rolePermissionsFromDb, ...activeDelegations])]
    : [...new Set([...(rolePermissionDefaults[row.role] ?? []), ...activeDelegations])];
  return {
    id: row.id,
    firebaseUid: row.firebaseUid,
    email: row.email,
    displayName: row.displayName,
    role: row.role as CurrentUser["role"],
    organizationId: row.organizationId,
    organizationName: organization.name,
    campusId: activeCampus?.id,
    campusName: activeCampus?.name,
    campusIds,
    availableCampuses,
    classSectionScopes: classRows.map(({ classId, sectionId }) => ({ classId, sectionId: sectionId === "*" ? undefined : sectionId })),
    linkedStudentId: row.linkedStudentId ?? undefined,
    linkedEmployeeId: row.linkedEmployeeId ?? undefined,
    linkedGuardianId: row.linkedGuardianId ?? undefined,
    emailVerified: row.emailVerified,
    permissions: effectivePermissions,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSessionIdentity();
  if (!session) return null;
  const user = await getUserByFirebaseUid(session.uid);
  if (!user) return null;
  const activeSession = await getDb().query.sessionLogs.findFirst({ where: and(
    eq(sessionLogs.organizationId, user.organizationId),
    eq(sessionLogs.userId, user.id),
    eq(sessionLogs.firebaseSessionId, session.fingerprint),
    eq(sessionLogs.status, "active"),
    isNull(sessionLogs.revokedAt),
    gt(sessionLogs.expiresAt, new Date()),
  ) });
  if (!activeSession) return null;
  const selectedCampusId = await readActiveCampusId();
  return getUserByFirebaseUid(session.uid, selectedCampusId);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "You must be signed in.", 401);
  return user;
}

export async function requirePermission(permission: string) {
  const user = await requireUser();
  const result = checkPermission(user, permission);
  if (!result.allowed) throw new AppError("FORBIDDEN", result.reason ?? "You do not have permission.", 403);
  return user;
}
