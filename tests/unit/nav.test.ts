import { describe, expect, it } from "vitest";
import { isNavigationItemActive, navigationForRole } from "@/config/nav";
import { breadcrumbsForPath, configuredRoutePaths, genericCatalogPaths, genericIntegrationPaths, isReleasedRoute, plannedPaths, reservedCatalogPaths, routeDefinitions, routeLabelForPath, routePresentationForPath } from "@/config/route-registry";

describe("role-aware navigation", () => {
  it("groups administrator navigation without changing destination order", () => {
    const groups = navigationForRole("admin");
    expect(groups[0]?.label).toBe("Overview");
    expect(groups[0]?.items[0]?.href).toBe("/dashboard");
    expect(groups.find((group) => group.label === "Students & admissions")?.items.map((item) => item.href)).toEqual([
      "/students",
      "/students/import",
      "/admissions/enquiries",
      "/admissions/seat-matrix",
    ]);
  });

  it("keeps child routes active while avoiding duplicate parent highlights", () => {
    const students = navigationForRole("admin").flatMap((group) => group.items).find((item) => item.href === "/students");
    const importItem = navigationForRole("admin").flatMap((group) => group.items).find((item) => item.href === "/students/import");
    expect(students && isNavigationItemActive("/students/student-1/profile", students)).toBe(true);
    expect(students && isNavigationItemActive("/students/import", students)).toBe(false);
    expect(importItem && isNavigationItemActive("/students/import", importItem)).toBe(true);
  });

  it("keeps portal navigation scoped to the user's role", () => {
    const labels = navigationForRole("teacher").flatMap((group) => group.items).map((item) => item.label);
    expect(labels).toContain("My Dashboard");
    expect(labels).not.toContain("Fees & Finance");
  });

  it("keeps deep route orientation human-readable and semantic", () => {
    expect(routeLabelForPath("/students/student-123/profile")).toBe("Profile");
    expect(breadcrumbsForPath("/students/student-123/profile")).toEqual([
      { label: "Students", href: "/students" },
      { label: "Students profile" },
      { label: "Profile" },
    ]);
    expect(routeLabelForPath("/settings/academic-years")).toBe("Academic years");
    expect(breadcrumbsForPath("/settings/academic-years")).toEqual([
      { label: "Settings", href: "/settings" },
      { label: "Academic years" },
    ]);
    expect(routeLabelForPath("/settings/seat-matrix")).toBe("Seat matrix");
    expect(routeLabelForPath("/exams/question-bank")).toBe("Question bank");
    expect(routePresentationForPath("/analytics/finance")).toBe("dedicated");
    expect(routePresentationForPath("/fees/payments")).toBe("dedicated");
    expect(routeLabelForPath("/students/[id]")).toBe("Students profile");
  });

  it("keeps every role navigation destination inside the released route registry", () => {
    for (const role of ["admin", "teacher", "parent", "student", "alumni"]) {
      const items = navigationForRole(role).flatMap((group) => group.items);
      expect(items.every((item) => isReleasedRoute(item.href))).toBe(true);
      expect(items.some((item) => plannedPaths.has(item.href))).toBe(false);
      expect(items.some((item) => genericCatalogPaths.has(item.href))).toBe(false);
      expect(items.some((item) => genericIntegrationPaths.has(item.href))).toBe(false);
    }
  });

  it("does not expose duplicate administrator destinations", () => {
    const destinations = navigationForRole("admin").flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  it("keeps the configured route inventory represented in the presentation registry", () => {
    expect(routeDefinitions.map((route) => route.path)).toEqual(configuredRoutePaths);
    expect(new Set(routeDefinitions.map((route) => route.path)).size).toBe(routeDefinitions.length);
    expect(routeDefinitions.find((route) => route.path === "/settings/permissions")?.presentation).toBe("planned");
    expect(routeDefinitions.find((route) => route.path === "/settings/permissions")?.releaseStatus).toBe("unreleased");
    expect(routeDefinitions.find((route) => route.path === "/settings/classes")).toMatchObject({ owner: "foundation", permission: "settings:read", releaseStatus: "released" });
    expect(plannedPaths.size).toBe(15);
    expect(genericCatalogPaths.size).toBe(26);
    expect(genericIntegrationPaths.size).toBe(4);
    expect(reservedCatalogPaths.size).toBe(5);
  });
});
