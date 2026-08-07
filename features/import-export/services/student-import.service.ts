import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { importJobs, jobRuns } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { CurrentUser } from "@/lib/auth/types";
import { createStudentRecord } from "@/features/students/services/students.service";
import { encryptSecret } from "@/lib/security/secret-box";
import { enqueueJob } from "@/lib/jobs/job-store";
import { createId } from "@/lib/utils/ids";
import { parseStudentCsv } from "./student-import-parser";
import type { ImportRowError, StudentImportParseResult } from "./student-import-parser";

export const MAX_IMPORT_ROWS = 1_000;
const MAX_SYNCHRONOUS_ROWS = 250;

type StudentImportOptions = {
  queueLarge?: boolean;
  idempotencyKey?: string;
  existingImportJobId?: string;
};

async function createImportJob(user: CurrentUser, parsed: StudentImportParseResult, status: "queued" | "processing") {
  const [job] = await getDb().insert(importJobs).values({
    id: createId("import_job"),
    organizationId: user.organizationId,
    campusId: user.campusId,
    entityType: "students",
    totalRows: parsed.totalRows,
    processedRows: 0,
    errorRows: parsed.errors.length,
    errorsJson: parsed.errors.length ? JSON.stringify(parsed.errors.slice(0, 200)) : null,
    status,
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!job) throw new AppError("DATABASE_ERROR", "Unable to create import job.", 500);
  return job;
}

async function updateImportProgress(user: CurrentUser, importJobId: string, processedRows: number, errorRows: number, status: string, errors: ImportRowError[]) {
  const [job] = await getDb().update(importJobs).set({
    processedRows,
    errorRows,
    errorsJson: errors.length ? JSON.stringify(errors.slice(0, 200)) : null,
    status,
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(eq(importJobs.id, importJobId), eq(importJobs.organizationId, user.organizationId))).returning();
  if (!job) throw new AppError("NOT_FOUND", "Import job not found in the current organization.", 404);
  return job;
}

async function processParsedStudentImport(user: CurrentUser, parsed: StudentImportParseResult, importJobId: string) {
  const errors = [...parsed.errors];
  let importedRows = 0;
  await updateImportProgress(user, importJobId, 0, errors.length, "processing", errors);
  for (const [index, row] of parsed.validRows.entries()) {
    try {
      await createStudentRecord(user, { ...row, gender: "" });
      importedRows += 1;
    } catch (error) {
      errors.push({ row: index + 2, fields: { row: [error instanceof Error ? error.message : "Unable to import row."] } });
    }
    if ((index + 1) % 25 === 0 || index === parsed.validRows.length - 1) {
      await updateImportProgress(user, importJobId, index + 1, errors.length, "processing", errors);
    }
  }
  const status = errors.length ? "completed_with_errors" : "completed";
  const updated = await updateImportProgress(user, importJobId, parsed.totalRows, errors.length, status, errors);
  return { job: updated, importedRows, errors };
}

export async function runStudentImport(user: CurrentUser, csv: string, options: StudentImportOptions = {}) {
  const parsed = parseStudentCsv(csv);
  if (parsed.totalRows > MAX_IMPORT_ROWS) throw new AppError("VALIDATION_ERROR", `Imports are limited to ${MAX_IMPORT_ROWS} rows per request.`, 422);
  if (parsed.totalRows > MAX_SYNCHRONOUS_ROWS && options.queueLarge !== false) {
    if (options.idempotencyKey) {
      const existingRun = await getDb().query.jobRuns.findFirst({ where: and(eq(jobRuns.organizationId, user.organizationId), eq(jobRuns.idempotencyKey, options.idempotencyKey)) });
      if (existingRun) {
        const payload = JSON.parse(existingRun.payloadJson) as { importJobId?: string };
        const existingImportJob = payload.importJobId ? await getDb().query.importJobs.findFirst({ where: and(eq(importJobs.id, payload.importJobId), eq(importJobs.organizationId, user.organizationId)) }) : undefined;
        if (existingImportJob) return { queued: true as const, job: existingRun, importJobId: existingImportJob.id, importedRows: existingImportJob.processedRows - existingImportJob.errorRows, errors: parseErrors(existingImportJob.errorsJson) };
      }
    }
    const importJob = await createImportJob(user, parsed, "queued");
    const job = await enqueueJob(user, {
      jobType: "students.import",
      campusId: user.campusId,
      idempotencyKey: options.idempotencyKey,
      payloadJson: JSON.stringify({
        encryptedCsv: encryptSecret(csv),
        importJobId: importJob.id,
        firebaseUid: user.firebaseUid,
        organizationId: user.organizationId,
        campusId: user.campusId ?? null,
      }),
    });
    await writeAuditLog(user, {
      action: "import",
      module: "students",
      entityType: "import_job",
      entityId: job.id,
      campusId: job.campusId,
      metadata: { entityType: "students", totalRows: parsed.totalRows, errorRows: parsed.errors.length },
    });
    return { queued: true as const, job, importJobId: importJob.id, importedRows: 0, errors: parsed.errors };
  }
  const job = await createImportJob(user, parsed, "processing");
  const result = await processParsedStudentImport(user, parsed, job.id);
  await writeAuditLog(user, {
    action: "import",
    module: "students",
    entityType: "import_job",
    entityId: result.job.id,
    campusId: job.campusId,
    metadata: { entityType: "students", totalRows: parsed.totalRows, errorRows: result.errors.length },
  });
  return { queued: false as const, job: result.job, importJobId: result.job.id, importedRows: result.importedRows, errors: result.errors };
}

function parseErrors(errorsJson: string | null) {
  if (!errorsJson) return [];
  try { return JSON.parse(errorsJson) as ImportRowError[]; } catch { return []; }
}

export async function listStudentImportJobs(user: CurrentUser) {
  const rows = await getDb().select({ id: importJobs.id, totalRows: importJobs.totalRows, processedRows: importJobs.processedRows, errorRows: importJobs.errorRows, status: importJobs.status, createdAt: importJobs.createdAt }).from(importJobs).where(and(
    eq(importJobs.organizationId, user.organizationId),
    eq(importJobs.entityType, "students"),
    user.campusId ? eq(importJobs.campusId, user.campusId) : undefined,
  )).orderBy(desc(importJobs.createdAt)).limit(30);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toLocaleString() }));
}

export async function getStudentImportErrors(user: CurrentUser, importJobId: string) {
  const row = await getDb().query.importJobs.findFirst({ where: and(
    eq(importJobs.id, importJobId),
    eq(importJobs.organizationId, user.organizationId),
    eq(importJobs.entityType, "students"),
    user.campusId ? eq(importJobs.campusId, user.campusId) : undefined,
  ) });
  if (!row) throw new AppError("NOT_FOUND", "Import job not found.", 404);
  return { ...row, errors: parseErrors(row.errorsJson) };
}
