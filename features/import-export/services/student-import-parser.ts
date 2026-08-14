import Papa from "papaparse";
import * as XLSX from "xlsx";
import { studentImportRowSchema, supportedStudentImportHeaders, type StudentImportRow } from "../schemas/student-import.schema";

export type ImportRowError = { row: number; fields: Record<string, string[]> };
export type ParsedStudentImportRow = { rowNumber: number; data: StudentImportRow };
export type StudentImportParseResult = { validRows: ParsedStudentImportRow[]; errors: ImportRowError[]; totalRows: number };

function headerToken(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLocaleLowerCase().replace(/[\s_-]+/g, "");
}

const headerAliases = new Map<string, string>([
  ["admissionnumber", "admissionNumber"], ["admissionno", "admissionNumber"], ["studentadmissionnumber", "admissionNumber"],
  ["firstname", "firstName"], ["studentfirstname", "firstName"],
  ["lastname", "lastName"], ["studentlastname", "lastName"],
  ["campus", "campus"], ["campusname", "campus"], ["campuscode", "campus"], ["campusid", "campusId"],
  ["academicyear", "academicYear"], ["academicyearname", "academicYear"], ["academicyearid", "academicYearId"],
  ["class", "class"], ["classname", "class"], ["classcode", "class"], ["classid", "classId"],
  ["section", "section"], ["sectionname", "section"], ["sectionid", "sectionId"],
  ["rollnumber", "rollNumber"], ["rollno", "rollNumber"],
]);

function canonicalHeader(value: string) {
  return headerAliases.get(headerToken(value)) ?? value.replace(/^\uFEFF/, "").trim();
}

function normalizeRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [canonicalHeader(key), value]));
}

function headerErrors(fields: string[] | undefined): ImportRowError[] {
  if (!fields?.length) return [{ row: 1, fields: { file: ["The file must contain a header row."] } }];
  const errors: ImportRowError[] = [];
  const canonicalFields = fields.map(canonicalHeader);
  const unknown = fields.filter((field, index) => field.trim() && !supportedStudentImportHeaders.has(canonicalFields[index]));
  if (unknown.length) errors.push({ row: 1, fields: { headers: [`Unsupported column(s): ${unknown.join(", ")}. Use the downloadable template columns.`] } });
  const seen = new Set<string>();
  const duplicates = canonicalFields.filter((field) => {
    if (seen.has(field)) return true;
    seen.add(field);
    return false;
  });
  if (duplicates.length) errors.push({ row: 1, fields: { headers: [`Duplicate column(s): ${[...new Set(duplicates)].join(", ")}. Keep one column for each field.`] } });
  const requiredGroups: Array<[string, string, string]> = [
    ["admissionNumber", "admissionNumber", "Admission number"],
    ["firstName", "firstName", "First name"],
    ["lastName", "lastName", "Last name"],
    ["campus", "campusId", "Campus"],
    ["academicYear", "academicYearId", "Academic year"],
    ["class", "classId", "Class"],
    ["section", "sectionId", "Section"],
  ];
  const missing = requiredGroups.filter(([friendly, legacy]) => !canonicalFields.includes(friendly) && !canonicalFields.includes(legacy)).map(([, , label]) => label);
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
    const sheetName = workbook.SheetNames.find((name) => name.trim().toLocaleLowerCase() === "students") ?? workbook.SheetNames[0];
    if (!sheetName) return { validRows: [], errors: [{ row: 1, fields: { file: ["The workbook does not contain a worksheet."] } }], totalRows: 0 };
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    const fields = Array.isArray(matrix[0]) ? matrix[0].map(String) : undefined;
    return validateStudentRows(rows, fields);
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
    const parsed = studentImportRowSchema.safeParse(normalizeRow(row));
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
