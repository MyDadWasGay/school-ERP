import { describe, expect, it } from "vitest";
import { parseStudentCsv } from "../services/student-import-parser";

describe("student imports", () => {
  it("returns valid rows and row-level duplicate errors", () => {
    const csv = [
      "admissionNumber,firstName,lastName,campusId,academicYearId,classId,sectionId",
      "ST-1,Aarav,Sharma,c1,y1,class-1,section-a",
      "ST-1,Meera,Iyer,c1,y1,class-1,section-a",
    ].join("\n");
    const result = parseStudentCsv(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ row: 3 });
  });
});
