import { describe, expect, it } from "vitest";
import { assertCatalogRoute } from "@/server/api/routes/catalog.routes";
import { isConfiguredRoute, isReleasedCatalogRoute, isReleasedRoute, isUnreleasedConfiguredRoute, releasedCatalogPaths, unreleasedPaths } from "@/config/route-registry";

describe("released catalog boundary", () => {
  it("rejects generic and planned routes before any catalog read or write", () => {
    for (const route of ["/activities/houses", "/integrations/payment", "/settings/permissions", "/cms/news"]) {
      expect(isReleasedRoute(route)).toBe(false);
      expect(isReleasedCatalogRoute(route)).toBe(false);
      expect(() => assertCatalogRoute(route)).toThrowError("This workflow is not released.");
    }
    expect(isReleasedRoute("/analytics/finance")).toBe(true);
    expect(isReleasedCatalogRoute("/analytics/finance")).toBe(false);
    expect(() => assertCatalogRoute("/analytics/finance")).toThrowError("This workflow is not released.");
  });

  it("keeps every configured unreleased route outside the released boundary", () => {
    for (const route of unreleasedPaths) {
      expect(isUnreleasedConfiguredRoute(route)).toBe(true);
      expect(isReleasedRoute(route)).toBe(false);
      expect(() => assertCatalogRoute(route)).toThrowError("This workflow is not released.");
    }
  });

  it("does not expose a module-record fallback as a released catalog", () => {
    expect(releasedCatalogPaths.size).toBe(0);
    expect(() => assertCatalogRoute("/settings/classes")).toThrowError("This workflow is not released.");
  });

  it("requires dedicated APIs for student operations", () => {
    expect(() => assertCatalogRoute("/students")).toThrowError("dedicated versioned API route");
  });

  it("recognizes dedicated dynamic records without opening arbitrary paths", () => {
    expect(isConfiguredRoute("/students/student-1/profile")).toBe(true);
    expect(isConfiguredRoute("/users/user-1")).toBe(true);
    expect(isConfiguredRoute("/settings/not-a-real-workflow")).toBe(false);
  });
});
