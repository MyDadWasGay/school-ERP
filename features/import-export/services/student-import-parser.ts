import Papa from "papaparse";
import * as XLSX from "xlsx";
import { studentImportRowSchema, supportedStudentImportHeaders, type StudentImportRow } from "../schemas/student-import.schema";

export type ImportRowError = { row: number; fields: Record<string, string[]> };
export type ParsedStudentImportRow = { rowNumber: number; data: StudentImportRow };
export type StudentImportParseResult = { validRows: ParsedStudentImportRow[]; errors: ImportRowError[]; totalRows: number };

function headerErrors(fields: string[] | undefined): ImportRowError[] {
  if (!fields?.length) return [{ row: 1, fields: { file: ["The file must contain a header row."] } }];
  const errors: ImportRowError[] = [];
  const unknown = fields.filter((field) => field.trim() && !supportedStudentImportHeaders.has(field.trim()));
  if (unknown.length) errors.push({ row: 1, fields: { headers: [`Unsupported column(s): ${unknown.join(", ")}. Use the downloadable template columns.`] } });
  const requiredGroups: Array<[string, string, string]> = [
    ["admissionNumber", "admissionNumber", "Admission number"],
    ["firstName", "firstName", "First name"],
    ["lastName", "lastName", "Last name"],
    ["campus", "campusId", "Campus"],
    ["academicYear", "academicYearId", "Academic year"],
    ["class", "classId", "Class"],
    ["section", "sectionId", "Section"],
  ];
  const missing = requiredGroups.filter(([friendly, legacy]) => !fields.includes(friendly) && !fields.includes(legacy)).map(([, , label]) => label);
  if (missing.length) errors.push({ row: 1, fields: { headers: [`Missing required column(s): ${missing.join(", ")}. Use the downloadable template columns.`] } });
  return errors;
}

export function parseStudentCsv(content: string): StudentImportParseResult {
  const result = Papa.parse<Record<string, unknown>>(content, { header: true, skipEmptyLines: "greedy" });
  const parserErrors: ImportRowError[] = result.errors.map((error) => ({
    row: (error.row ?? 0) + 2,
    fields: { file: [error.message || "The CSV row could not be read."] },
  }));
  return validateStudentRows(result.data, result.meta.fields, parserErrors);
}

export function parseStudentWorkbook(content: ArrayBuffer): StudentImportParseResult {
  try {
    const workbook = XLSX.read(content, { type: "array", cellDates: false });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return { validRows: [], errors: [{ row: 1, fields: { file: ["The workbook does not contain a worksheet."] } }], totalRows: 0 };
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "" });
    return validateStudentRows(rows, rows.length ? Object.keys(rows[0]) : undefined);
  } catch {
    return { validRows: [], errors: [{ row: 1, fields: { file: ["The spreadsheet could not be read. Check that it is a valid XLSX or XLS file."] } }], totalRows: 0 };
  }
}

export function validateStudentRows(rows: Record<string, unknown>[], fields?: string[], initialErrors: ImportRowError[] = []): StudentImportParseResult {
  const validRows: ParsedStudentImportRow[] = [];
  const errors: ImportRowError[] = [...initialErrors, ...headerErrors(fields)];
  if (rows.length === 0 && fields?.length) errors.push({ row: 2, fields: { file: ["The file must contain at least one student row."] } });
  const admissionNumbers = new Set<string>();
  rows.forEach((row, index) => {
    const parsed = studentImportRowSchema.safeParse(row);
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors)
          .filter(([, messages]) => messages && messages.length > 0)
          .map(([field, messages]) => [field, messages ?? []]),
      ) as Record<string, string[]>;
      errors.push({ row: index + 2, fields: fieldErrors });
      return;
    }
    if (admissionNumbers.has(parsed.data.admissionNumber)) {
      errors.push({ row: index + 2, fields: { admissionNumber: ["Duplicate admission number in this file."] } });
      return;
    }
    admissionNumbers.add(parsed.data.admissionNumber);
    validRows.push({ rowNumber: index + 2, data: parsed.data });
  });
  return { validRows, errors, totalRows: rows.length };
}
