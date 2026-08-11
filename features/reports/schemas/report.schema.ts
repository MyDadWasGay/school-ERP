import { z } from "zod";

export const REPORT_TYPES = [
  "students",
  "admissions",
  "attendance",
  "finance",
  "exams",
  "payroll",
  "inventory",
  "library",
  "transport",
  "hostel",
  "communication",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const reportQuerySchema = z.object({
  report: z.enum(REPORT_TYPES).default("students"),
  limit: z.coerce.number().int().min(1).max(2_000).default(500),
});

export const reportExportSchema = reportQuerySchema.extend({
  format: z.enum(["csv", "xlsx", "html", "pdf"]),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
