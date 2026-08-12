import { describe, expect, it } from "vitest";
import { isNavigationItemActive, navigationForRole } from "@/config/nav";
import { breadcrumbsForPath, configuredRoutePaths, routeDefinitions, routeLabelForPath, routePresentationForPath } from "@/config/route-registry";

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
    expect(routePresentationForPath("/analytics/finance")).toBe("planned");
    expect(routePresentationForPath("/fees/payments")).toBe("dedicated");
    expect(routeLabelForPath("/students/[id]")).toBe("Students profile");
  });

  it("does not expose duplicate administrator destinations", () => {
    const destinations = navigationForRole("admin").flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  it("keeps the configured route inventory represented in the presentation registry", () => {
    expect(routeDefinitions.map((route) => route.path)).toEqual(configuredRoutePaths);
    expect(new Set(routeDefinitions.map((route) => route.path)).size).toBe(routeDefinitions.length);
    expect(routeDefinitions.find((route) => route.path === "/settings/permissions")?.presentation).toBe("planned");
  });
});
