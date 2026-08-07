import { describe, expect, it } from "vitest";
import { academicSetupSchema } from "../schemas/academic-setup.schema";

describe("academic setup validation", () => {
  it("rejects an academic year whose end is not after its start", () => {
    const result = academicSetupSchema.safeParse({
      kind: "academic_year",
      campusId: "campus-1",
      name: "2026-27",
      startsOn: "2027-04-01",
      endsOn: "2026-03-31",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("normalizes class codes and enforces positive section capacity", () => {
    const classResult = academicSetupSchema.parse({
      kind: "class",
      campusId: "campus-1",
      name: "Grade Eight",
      code: "g8",
      sortOrder: "8",
    });
    expect(classResult.kind === "class" && classResult.code).toBe("G8");
    expect(academicSetupSchema.safeParse({
      kind: "section",
      campusId: "campus-1",
      classId: "class-8",
      name: "A",
      capacity: 0,
    }).success).toBe(false);
  });
});
