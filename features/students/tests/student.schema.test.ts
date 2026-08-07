import { describe, expect, it } from "vitest";
import { studentSchema } from "../schemas/student.schema";

describe("student schema", () => {
  it("requires identity and campus", () => expect(studentSchema.safeParse({ admissionNumber: "ST-1", firstName: "Aarav", lastName: "Sharma", campusId: "campus-1" }).success).toBe(true));
  it("accepts blank optional enrollment inputs", () => expect(studentSchema.safeParse({ admissionNumber: "ST-1", firstName: "Aarav", lastName: "Sharma", campusId: "campus-1", academicYearId: "", classId: "", sectionId: "" }).success).toBe(true));
  it("rejects incomplete records", () => expect(studentSchema.safeParse({ firstName: "A" }).success).toBe(false));
});
