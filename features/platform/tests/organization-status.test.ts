import { describe, expect, it } from "vitest";
import {
  canTransitionOrganizationStatus,
  getAllowedOrganizationStatusTransitions,
  isOrganizationStatus,
} from "@/config/organization-status";

describe("organization lifecycle", () => {
  it("allows only the documented lifecycle transitions", () => {
    expect(canTransitionOrganizationStatus("provisioning", "active")).toBe(true);
    expect(canTransitionOrganizationStatus("active", "suspended")).toBe(true);
    expect(canTransitionOrganizationStatus("suspended", "active")).toBe(true);
    expect(canTransitionOrganizationStatus("archived", "deletion_scheduled")).toBe(true);
    expect(canTransitionOrganizationStatus("active", "deletion_scheduled")).toBe(false);
    expect(canTransitionOrganizationStatus("archived", "suspended")).toBe(false);
    expect(canTransitionOrganizationStatus("unknown", "active")).toBe(false);
  });

  it("keeps transition choices typed and rejects unknown statuses", () => {
    expect(isOrganizationStatus("deletion_scheduled")).toBe(true);
    expect(isOrganizationStatus("deleted")).toBe(false);
    expect(getAllowedOrganizationStatusTransitions("active")).toEqual(["suspended", "archived"]);
    expect(getAllowedOrganizationStatusTransitions("deleted")).toEqual([]);
  });
});
