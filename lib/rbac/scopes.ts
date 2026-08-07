import type { CurrentUser } from "@/lib/auth/types";

export type ScopedResource = {
  organizationId: string;
  campusId?: string;
  classId?: string;
  sectionId?: string;
  ownerUserId?: string;
  studentId?: string;
  guardianId?: string;
  employeeId?: string;
};

export function isInTenant(user: CurrentUser, resource: Pick<ScopedResource, "organizationId">) {
  // A role never grants a cross-tenant exception. Platform identities use a
  // separate authorization path; school users must always match the tenant.
  return resource.organizationId === user.organizationId;
}

export function isInCampus(user: CurrentUser, resource: ScopedResource) {
  if (!resource.campusId) return true;
  const campuses = user.campusIds ?? [user.campusId].filter((value): value is string => Boolean(value));
  return campuses.length === 0 || campuses.includes(resource.campusId);
}

export function isInClassSection(user: CurrentUser, resource: ScopedResource) {
  const scopes = user.classSectionScopes ?? [];
  if (!resource.classId || scopes.length === 0) return true;
  return scopes.some(
    (scope) =>
      scope.classId === resource.classId &&
      (!scope.sectionId || !resource.sectionId || scope.sectionId === resource.sectionId),
  );
}

export function isOwnedResource(user: CurrentUser, resource: ScopedResource) {
  if (resource.ownerUserId && resource.ownerUserId === user.id) return true;
  if (resource.studentId && resource.studentId === user.linkedStudentId) return true;
  if (resource.employeeId && resource.employeeId === user.linkedEmployeeId) return true;
  if (resource.guardianId && resource.guardianId === user.linkedGuardianId) return true;
  return false;
}

export function canAccessResource(user: CurrentUser, resource: ScopedResource, ownershipRequired = false) {
  const scoped = isInTenant(user, resource) && isInCampus(user, resource) && isInClassSection(user, resource);
  return scoped && (!ownershipRequired || isOwnedResource(user, resource));
}
