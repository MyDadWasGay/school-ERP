import { describe, expect, it } from "vitest";
import { assertPortalAccess, canAccessPortal } from "../services/portal-access";

describe("portal role access", () => {
  it("allows each role to open only its matching portal", () => {
    expect(canAccessPortal("teacher", "teacher")).toBe(true);
    expect(canAccessPortal("parent", "parent")).toBe(true);
    expect(canAccessPortal("student", "student")).toBe(true);
    expect(canAccessPortal("teacher", "parent")).toBe(false);
    expect(canAccessPortal("parent", "teacher")).toBe(false);
    expect(canAccessPortal("student", "parent")).toBe(false);
  });

  it("keeps explicitly supervisory roles able to review all portals", () => {
    for (const role of ["super_admin", "management", "principal"] as const) {
      expect(canAccessPortal(role, "teacher")).toBe(true);
      expect(canAccessPortal(role, "parent")).toBe(true);
      expect(canAccessPortal(role, "student")).toBe(true);
    }
  });

  it("fails closed when a user opens another role's portal directly", () => {
    expect(() => assertPortalAccess("parent", "teacher")).toThrow(
      /cannot open the teacher portal/i,
    );
  });
});
