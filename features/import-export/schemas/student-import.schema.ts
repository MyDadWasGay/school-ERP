import { z } from "zod";

export const studentImportColumns = [
  { key: "admissionNumber", required: true, format: "Text", example: "STU-2026-001", description: "Unique admission number within the school." },
  { key: "firstName", required: true, format: "Text", example: "Aarav", description: "Student first name." },
  { key: "lastName", required: true, format: "Text", example: "Sharma", description: "Student last name." },
  { key: "campus", required: true, format: "Campus name or code", example: "Main Campus", description: "Must match one accessible active campus." },
  { key: "academicYear", required: true, format: "Academic year name", example: "2026-2027", description: "Must match an active year at the selected campus." },
  { key: "class", required: true, format: "Class name or code", example: "Grade 6", description: "Must belong to the selected campus." },
  { key: "section", required: true, format: "Section name", example: "A", description: "Must belong to the selected class and campus." },
  { key: "rollNumber", required: false, format: "Text", example: "12", description: "Optional roll number, unique within the class section and academic year." },
] as const;

export const studentImportHeaderNames = studentImportColumns.map((column) => column.key);
export const studentImportLegacyHeaders = ["campusId", "academicYearId", "classId", "sectionId"] as const;
export const supportedStudentImportHeaders = new Set<string>([
  ...studentImportHeaderNames,
  ...studentImportLegacyHeaders,
]);

function requiredText(max: number, min = 1) {
  return z.preprocess(
    (value) => value === null || value === undefined ? "" : String(value),
    z.string().trim().min(min).max(max),
  );
}

function optionalText(max: number) {
  return z.preprocess(
    (value) => value === null || value === undefined || String(value).trim() === "" ? undefined : String(value),
    z.string().trim().max(max).optional(),
  );
}

export const studentImportRowSchema = z.object({
  admissionNumber: requiredText(40, 2),
  firstName: requiredText(80, 2),
  lastName: requiredText(80),
  campus: optionalText(120),
  academicYear: optionalText(120),
  class: optionalText(120),
  section: optionalText(120),
  campusId: optionalText(120),
  academicYearId: optionalText(120),
  classId: optionalText(120),
  sectionId: optionalText(120),
  rollNumber: optionalText(30),
}).passthrough().superRefine((input, context) => {
  const references: Array<[keyof typeof input, keyof typeof input, string]> = [
    ["campus", "campusId", "campus"],
    ["academicYear", "academicYearId", "academic year"],
    ["class", "classId", "class"],
    ["section", "sectionId", "section"],
  ];
  for (const [friendlyKey, legacyKey, label] of references) {
    if (!input[friendlyKey] && !input[legacyKey]) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [friendlyKey], message: `${label} is required.` });
    }
  }
});

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;
