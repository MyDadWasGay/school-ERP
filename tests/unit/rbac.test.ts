import { describe, expect, it } from "vitest";
import { checkPermission } from "@/lib/rbac/check-permission";
import { canAccessResource, isInClassSection, isOwnedResource } from "@/lib/rbac/scopes";
import type { CurrentUser } from "@/lib/auth/types";

const user: CurrentUser = { id: "u1", firebaseUid: "f1", email: "admin@example.com", displayName: "Admin", role: "management", organizationId: "org-1", campusId: "campus-1", campusIds: ["campus-1"], classSectionScopes: [{ classId: "class-8", sectionId: "section-a" }], linkedStudentId: "student-1", permissions: ["students:read"] };
const superAdmin = { ...user, role: "super_admin" as const, permissions: ["students:read"] };

describe("server RBAC", () => {
  it("allows explicitly granted permissions", () => expect(checkPermission(user, "students:read").allowed).toBe(true));
  it("rejects permissions that are not granted", () => expect(checkPermission(user, "fees:collect").allowed).toBe(false));
  it("enforces tenant and campus scope", () => { expect(canAccessResource(user, { organizationId: "org-1", campusId: "campus-1" })).toBe(true); expect(canAccessResource(user, { organizationId: "org-2", campusId: "campus-1" })).toBe(false); expect(canAccessResource(user, { organizationId: "org-1", campusId: "campus-2" })).toBe(false); });
  it("never treats super_admin as a cross-tenant bypass", () => {
    expect(canAccessResource(superAdmin, { organizationId: "org-1", campusId: "campus-1" })).toBe(true);
    expect(canAccessResource(superAdmin, { organizationId: "org-2", campusId: "campus-1" })).toBe(false);
    expect(checkPermission(superAdmin, "fees:collect").allowed).toBe(false);
  });
  it("enforces class, section and ownership scope", () => {
    expect(isInClassSection(user, { organizationId: "org-1", classId: "class-8", sectionId: "section-a" })).toBe(true);
    expect(isInClassSection(user, { organizationId: "org-1", classId: "class-8", sectionId: "section-b" })).toBe(false);
    expect(isOwnedResource(user, { organizationId: "org-1", studentId: "student-1" })).toBe(true);
    expect(canAccessResource(user, { organizationId: "org-1", campusId: "campus-1", studentId: "student-2" }, true)).toBe(false);
  });
});
