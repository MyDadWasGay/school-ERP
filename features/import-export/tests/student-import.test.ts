import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseStudentCsv, parseStudentWorkbook } from "../services/student-import-parser";

describe("student imports", () => {
  it("returns valid rows and row-level duplicate errors", () => {
    const csv = [
      "admissionNumber,firstName,lastName,campus,academicYear,class,section",
      "ST-1,Aarav,Sharma,Main Campus,2026-2027,Grade 6,A",
      "ST-1,Meera,Iyer,Main Campus,2026-2027,Grade 6,A",
    ].join("\n");
    const result = parseStudentCsv(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ row: 3 });
  });

  it("parses XLSX rows and accepts legacy ids for compatibility", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["admissionNumber", "firstName", "lastName", "campusId", "academicYearId", "classId", "sectionId"],
      ["ST-2", "Meera", "Iyer", "c1", "y1", "class-1", "section-a"],
    ]), "Students");
    const result = parseStudentWorkbook(XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("reports unsupported headers before any row is considered ready", () => {
    const result = parseStudentCsv("admissionNumber,firstName,lastName,campus,academicYear,class,section,secret\nST-3,A,B,Main,2026,Grade 1,A,no");
    expect(result.errors[0]?.fields.headers?.[0]).toContain("Unsupported column");
  });
});
