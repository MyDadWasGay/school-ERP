import { describe, expect, it } from "vitest";
import { isConfiguredRoute, modules, permissionForPath } from "@/config/modules";

describe("route permission mapping", () => {
  it("maps every portal and operations route to a server permission", () => {
    expect(permissionForPath("/students")).toBe("students:read");
    expect(permissionForPath("/parent")).toBe("portals:read");
    expect(permissionForPath("/accounts/ledger")).toBe("accounts:read");
    expect(permissionForPath("/data-quality")).toBe("data_quality:read");
    expect(permissionForPath("/audit-logs")).toBe("audit_logs:read");
  });

  it("represents every planned route exactly once", () => {
    const routes = modules.flatMap((module) => module.routes);
    expect(routes).toHaveLength(166);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.every((route) => permissionForPath(route).endsWith(":read"))).toBe(true);
    expect(isConfiguredRoute("/library/issue-return")).toBe(true);
    expect(isConfiguredRoute("/unplanned-workspace")).toBe(false);
  });
});
