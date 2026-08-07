import { describe, expect, it } from "vitest";
import { createSchoolSchema, schoolStatusSchema } from "../schemas/platform.schema";

describe("platform school schemas", () => {
  it("normalizes the school slug inputs and campus code", () => {
    const result = createSchoolSchema.safeParse({
      name: "Green Valley School",
      slug: "green-valley-school",
      campusName: "Main Campus",
      campusCode: "main",
      adminName: "Asha Rao",
      adminEmail: "asha@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.campusCode).toBe("MAIN");
  });

  it("rejects unsafe slugs and invalid lifecycle states", () => {
    expect(createSchoolSchema.safeParse({
      name: "A School",
      slug: "A School",
      campusName: "Main",
      campusCode: "MAIN",
      adminName: "Admin User",
      adminEmail: "admin@example.com",
    }).success).toBe(false);
    expect(schoolStatusSchema.safeParse({ organizationId: "org-1", status: "deleted" }).success).toBe(false);
  });
});
