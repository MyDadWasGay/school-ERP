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

  it("normalizes BOM, case, spacing, and chooses the Students worksheet", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["ignored"], ["not an import"]]), "Instructions");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["\uFEFFAdmission Number", "FIRST NAME", "Last Name", "Campus Name", "Academic Year", "Class Code", "Section Name"],
      ["ST-4", "Ishaan", "Rao", "Main", "2026-2027", "G6", "A"],
    ]), "Students");
    const result = parseStudentWorkbook(XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows[0]?.data.admissionNumber).toBe("ST-4");
  });

  it("rejects duplicate columns after header normalization", () => {
    const result = parseStudentCsv("admissionNumber,Admission Number,firstName,lastName,campus,academicYear,class,section\nST-5,,A,B,Main,2026,Grade 1,A");
    expect(result.errors.some((error) => error.fields.headers?.[0]?.includes("Duplicate column"))).toBe(true);
  });
});
