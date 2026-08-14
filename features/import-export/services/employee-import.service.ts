import Papa from "papaparse";
import { and, eq, inArray, type AnyColumn } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "@/db/client";
import { importJobs } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { CurrentUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { createId } from "@/lib/utils/ids";
import { createEmployee } from "@/features/hr/services/hr.service";
import { employeeImportRowSchema, type EmployeeImportRow } from "../schemas/employee-import.schema";

const MAX_ROWS = 1_000;
const IMPORT_PROCESSING_STALE_MS = 15 * 60_000;
type RowError = { row: number; fields: Record<string, string[]> };
type ParsedEmployeeImport = {
  validRows: Array<{ rowNumber: number; data: EmployeeImportRow }>;
  errors: RowError[];
  totalRows: number;
};

function campusScope(user: CurrentUser, column: AnyColumn) {
  if (user.campusIds?.length) return inArray(column, user.campusIds);
  if (user.campusId) return eq(column, user.campusId);
  return hasPermission(user, "organizations:update") ? undefined : eq(column, "__no_campus__");
}

function parseCsv(csv: string): ParsedEmployeeImport {
  const parsed = Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: "greedy" });
  const validRows: ParsedEmployeeImport["validRows"] = [];
  const errors: RowError[] = parsed.errors.map((error) => ({
    row: (error.row ?? 0) + 2,
    fields: { csv: [error.message || "The CSV could not be parsed."] },
  }));
  const numbers = new Set<string>();
  parsed.data.forEach((row, index) => {
    const normalizedRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, "").trim(), value]));
    const result = employeeImportRowSchema.safeParse(normalizedRow);
    if (!result.success) {
      errors.push({ row: index + 2, fields: result.error.flatten().fieldErrors });
      return;
    }
    if (numbers.has(result.data.employeeNumber)) {
      errors.push({ row: index + 2, fields: { employeeNumber: ["Duplicate employee number in import file."] } });
      return;
    }
    numbers.add(result.data.employeeNumber);
    validRows.push({ rowNumber: index + 2, data: result.data });
  });
  return { validRows, errors, totalRows: parsed.data.length };
}

function parseErrors(value: string | null): RowError[] {
  if (!value) return [];
  try { return JSON.parse(value) as RowError[]; } catch { return []; }
}

function requestHash(csv: string) {
  return createHash("sha256").update(csv, "utf8").digest("hex");
}

function importedRowsFor(job: typeof importJobs.$inferSelect, errors = parseErrors(job.errorsJson)) {
  return Math.max(0, job.processedRows - errors.length);
}

async function findExistingImportJob(user: CurrentUser, idempotencyKey: string | undefined, hash: string) {
  if (!idempotencyKey) return undefined;
  const existing = await getDb().query.importJobs.findFirst({ where: and(
    eq(importJobs.organizationId, user.organizationId),
    eq(importJobs.entityType, "employees"),
    eq(importJobs.idempotencyKey, idempotencyKey),
    campusScope(user, importJobs.campusId),
  ) });
  if (existing?.requestHash && existing.requestHash !== hash) {
    throw new AppError("CONFLICT", "This idempotency key was already used for a different employee import.", 409);
  }
  return existing;
}

async function createImportJob(user: CurrentUser, parsed: ParsedEmployeeImport, idempotencyKey: string | undefined, hash: string) {
  const existing = await findExistingImportJob(user, idempotencyKey, hash);
  if (existing) return existing;
  try {
    const [job] = await getDb().insert(importJobs).values({
      id: createId("import_job"),
      organizationId: user.organizationId,
      campusId: user.campusId,
      entityType: "employees",
      totalRows: parsed.totalRows,
      processedRows: 0,
      errorRows: parsed.errors.length,
      errorsJson: parsed.errors.length ? JSON.stringify(parsed.errors) : null,
      idempotencyKey,
      requestHash: hash,
      status: "queued",
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    if (!job) throw new AppError("DATABASE_ERROR", "Unable to create employee import job.", 500);
    return job;
  } catch (error) {
    const concurrent = await findExistingImportJob(user, idempotencyKey, hash);
    if (concurrent) return concurrent;
    throw error;
  }
}

async function updateImportProgress(user: CurrentUser, importJobId: string, processedRows: number, errors: RowError[], status: string) {
  const [job] = await getDb().update(importJobs).set({
    processedRows,
    errorRows: errors.length,
    errorsJson: errors.length ? JSON.stringify(errors) : null,
    status,
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(
    eq(importJobs.id, importJobId),
    eq(importJobs.organizationId, user.organizationId),
    eq(importJobs.entityType, "employees"),
    campusScope(user, importJobs.campusId),
  )).returning();
  if (!job) throw new AppError("NOT_FOUND", "Employee import job not found in the current scope.", 404);
  return job;
}

async function claimImportJob(user: CurrentUser, importJobId: string) {
  const current = await getDb().query.importJobs.findFirst({ where: and(
    eq(importJobs.id, importJobId),
    eq(importJobs.organizationId, user.organizationId),
    eq(importJobs.entityType, "employees"),
    campusScope(user, importJobs.campusId),
  ) });
  if (!current) throw new AppError("NOT_FOUND", "Employee import job not found.", 404);
  if (current.status === "completed" || current.status === "completed_with_errors") {
    return { job: current, claimed: false, resuming: false };
  }

  const resuming = current.status === "processing";
  const stale = current.updatedAt < new Date(Date.now() - IMPORT_PROCESSING_STALE_MS);
  if (resuming && !stale) return { job: current, claimed: false, resuming };

  const [claimed] = await getDb().update(importJobs).set({
    status: "processing",
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(
    eq(importJobs.id, importJobId),
    eq(importJobs.organizationId, user.organizationId),
    eq(importJobs.entityType, "employees"),
    campusScope(user, importJobs.campusId),
    resuming
      ? and(eq(importJobs.status, "processing"), eq(importJobs.updatedAt, current.updatedAt))
      : eq(importJobs.status, "queued"),
  )).returning();
  if (claimed) return { job: claimed, claimed: true, resuming };

  const latest = await getDb().query.importJobs.findFirst({ where: and(
    eq(importJobs.id, importJobId),
    eq(importJobs.organizationId, user.organizationId),
    eq(importJobs.entityType, "employees"),
    campusScope(user, importJobs.campusId),
  ) });
  if (!latest) throw new AppError("NOT_FOUND", "Employee import job not found.", 404);
  return { job: latest, claimed: false, resuming: latest.status === "processing" };
}

async function processEmployeeImport(user: CurrentUser, parsed: ParsedEmployeeImport, importJobId: string) {
  const claim = await claimImportJob(user, importJobId);
  if (!claim.claimed) {
    const errors = parseErrors(claim.job.errorsJson);
    return { job: claim.job, importedRows: importedRowsFor(claim.job, errors), errors, idempotent: true };
  }

  const startIndex = claim.resuming ? Math.min(parsed.validRows.length, Math.max(0, claim.job.processedRows)) : 0;
  const errors = claim.resuming ? parseErrors(claim.job.errorsJson) : [...parsed.errors];
  let importedRows = 0;
  await updateImportProgress(user, importJobId, startIndex, errors, "processing");
  for (const [index, entry] of parsed.validRows.entries()) {
    if (index < startIndex) continue;
    try {
      await createEmployee(user, entry.data);
      importedRows += 1;
    } catch (error) {
      errors.push({ row: entry.rowNumber, fields: { row: [error instanceof Error ? error.message : "Unable to import employee row."] } });
    }
    if ((index + 1) % 25 === 0 || index === parsed.validRows.length - 1) {
      await updateImportProgress(user, importJobId, index + 1, errors, "processing");
    }
  }
  const updated = await updateImportProgress(user, importJobId, parsed.totalRows, errors, errors.length ? "completed_with_errors" : "completed");
  return { job: updated, importedRows: importedRows || importedRowsFor(updated, errors), errors, idempotent: false };
}

export async function runEmployeeImport(user: CurrentUser, csv: string, rawIdempotencyKey?: string) {
  if (!user.campusId && !hasPermission(user, "organizations:update"))
    throw new AppError("FORBIDDEN", "Select an active campus before importing employees.", 403);
  if (csv.length > 5_000_000) throw new AppError("VALIDATION_ERROR", "Employee imports are limited to 5 MB.", 422);
  const idempotencyKey = rawIdempotencyKey?.trim() || undefined;
  if (idempotencyKey && idempotencyKey.length > 120) throw new AppError("VALIDATION_ERROR", "The import idempotency key is too long.", 422);
  const parsed = parseCsv(csv);
  if (parsed.totalRows > MAX_ROWS) throw new AppError("VALIDATION_ERROR", `Imports are limited to ${MAX_ROWS} rows per request.`, 422);
  const job = await createImportJob(user, parsed, idempotencyKey, requestHash(csv));
  const result = await processEmployeeImport(user, parsed, job.id);
  if (!result.idempotent) {
    await writeAuditLog(user, {
      action: "import",
      module: "hr",
      entityType: "import_job",
      entityId: result.job.id,
      campusId: result.job.campusId,
      metadata: { entityType: "employees", totalRows: parsed.totalRows, importedRows: result.importedRows, errorRows: result.errors.length },
    });
  }
  return result;
}
