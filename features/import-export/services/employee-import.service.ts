import Papa from "papaparse";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { importJobs, jobRuns } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import { createEmployee } from "@/features/hr/services/hr.service";
import { employeeImportRowSchema, type EmployeeImportRow } from "../schemas/employee-import.schema";

const MAX_ROWS = 1_000;
type RowError = { row: number; fields: Record<string, string[]> };

function parseCsv(csv: string) {
  const parsed = Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: "greedy" });
  const validRows: EmployeeImportRow[] = []; const errors: RowError[] = []; const numbers = new Set<string>();
  parsed.data.forEach((row, index) => { const result = employeeImportRowSchema.safeParse(row); if (!result.success) { errors.push({ row: index + 2, fields: result.error.flatten().fieldErrors }); return; } if (numbers.has(result.data.employeeNumber)) { errors.push({ row: index + 2, fields: { employeeNumber: ["Duplicate employee number in import file."] } }); return; } numbers.add(result.data.employeeNumber); validRows.push(result.data); });
  return { validRows, errors, totalRows: parsed.data.length };
}

export async function runEmployeeImport(user: CurrentUser, csv: string, idempotencyKey?: string) {
  if (csv.length > 5_000_000) throw new AppError("VALIDATION_ERROR", "Employee imports are limited to 5 MB.", 422);
  const parsed = parseCsv(csv); if (parsed.totalRows > MAX_ROWS) throw new AppError("VALIDATION_ERROR", `Imports are limited to ${MAX_ROWS} rows per request.`, 422);
  if (idempotencyKey) { const existingRun = await getDb().query.jobRuns.findFirst({ where: and(eq(jobRuns.organizationId, user.organizationId), eq(jobRuns.idempotencyKey, idempotencyKey), eq(jobRuns.jobType, "employees.import")) }); if (existingRun) { const payload = JSON.parse(existingRun.payloadJson) as { importJobId?: string }; if (payload.importJobId) { const existingJob = await getDb().query.importJobs.findFirst({ where: and(eq(importJobs.id, payload.importJobId), eq(importJobs.organizationId, user.organizationId)) }); if (existingJob) return { job: existingJob, importedRows: Math.max(0, existingJob.processedRows - existingJob.errorRows), errors: parseErrors(existingJob.errorsJson), idempotent: true }; } } }
  const [job] = await getDb().insert(importJobs).values({ id: createId("import_job"), organizationId: user.organizationId, campusId: user.campusId, entityType: "employees", totalRows: parsed.totalRows, processedRows: 0, errorRows: parsed.errors.length, errorsJson: parsed.errors.length ? JSON.stringify(parsed.errors) : null, status: "processing", createdBy: user.id, updatedBy: user.id }).returning();
  if (!job) throw new AppError("DATABASE_ERROR", "Unable to create employee import job.", 500);
  const errors = [...parsed.errors]; let importedRows = 0;
  for (const [index, row] of parsed.validRows.entries()) { try { await createEmployee(user, row); importedRows += 1; } catch (error) { errors.push({ row: index + 2, fields: { row: [error instanceof Error ? error.message : "Unable to import employee row."] } }); } }
  const [updated] = await getDb().update(importJobs).set({ processedRows: parsed.totalRows, errorRows: errors.length, errorsJson: errors.length ? JSON.stringify(errors.slice(0, 200)) : null, status: errors.length ? "completed_with_errors" : "completed", updatedAt: new Date(), updatedBy: user.id }).where(and(eq(importJobs.id, job.id), eq(importJobs.organizationId, user.organizationId))).returning();
  if (!updated) throw new AppError("DATABASE_ERROR", "Unable to finalize employee import.", 500);
  if (idempotencyKey) { await getDb().insert(jobRuns).values({ id: createId("job"), organizationId: user.organizationId, campusId: user.campusId, jobType: "employees.import", payloadJson: JSON.stringify({ importJobId: updated.id }), status: "completed", runAfter: new Date(), completedAt: new Date(), idempotencyKey, createdBy: user.id, updatedBy: user.id }); }
  await writeAuditLog(user, { action: "import", module: "hr", entityType: "import_job", entityId: updated.id, campusId: updated.campusId, metadata: { entityType: "employees", totalRows: parsed.totalRows, importedRows, errorRows: errors.length } });
  return { job: updated, importedRows, errors, idempotent: false };
}

function parseErrors(value: string | null): RowError[] { if (!value) return []; try { return JSON.parse(value) as RowError[]; } catch { return []; } }
