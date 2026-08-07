import Papa from "papaparse";
import * as XLSX from "xlsx";
import { studentImportRowSchema, type StudentImportRow } from "../schemas/student-import.schema";

export type ImportRowError = { row: number; fields: Record<string, string[]> };
export type StudentImportParseResult = { validRows: StudentImportRow[]; errors: ImportRowError[]; totalRows: number };

export function parseStudentCsv(content: string) {
  const result = Papa.parse<Record<string, unknown>>(content, { header: true, skipEmptyLines: "greedy" });
  return validateStudentRows(result.data);
}

export function parseStudentWorkbook(content: ArrayBuffer) {
  const workbook = XLSX.read(content, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return { validRows: [], errors: [], totalRows: 0 };
  return validateStudentRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "" }));
}

export function validateStudentRows(rows: Record<string, unknown>[]): StudentImportParseResult {
  const validRows: StudentImportRow[] = [];
  const errors: ImportRowError[] = [];
  const admissionNumbers = new Set<string>();
  rows.forEach((row, index) => {
    const parsed = studentImportRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({ row: index + 2, fields: parsed.error.flatten().fieldErrors });
      return;
    }
    if (admissionNumbers.has(parsed.data.admissionNumber)) {
      errors.push({ row: index + 2, fields: { admissionNumber: ["Duplicate admission number in import file."] } });
      return;
    }
    admissionNumbers.add(parsed.data.admissionNumber);
    validRows.push(parsed.data);
  });
  return { validRows, errors, totalRows: rows.length };
}
