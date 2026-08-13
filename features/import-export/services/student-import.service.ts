import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { academicYears, campuses, classes, importJobs, jobRuns, sections, students } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { CurrentUser } from "@/lib/auth/types";
import { createStudentRecord } from "@/features/students/services/students.service";
import type { StudentInput } from "@/features/students/schemas/student.schema";
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

type ResolvedStudentImportParseResult = Omit<StudentImportParseResult, "validRows"> & {
  validRows: Array<{ rowNumber: number; data: StudentInput }>;
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

function normalized(value: string | undefined) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

type ScopedReference = { id: string; name: string; code?: string | null; campusId?: string | null; classId?: string | null };

function resolveReference(
  label: string,
  idValue: string | undefined,
  friendlyValue: string | undefined,
  rows: ScopedReference[],
) {
  if (idValue) {
    const byId = rows.find((row) => row.id === idValue);
    if (!byId) return { error: `${label} ID is not available in your organization or campus scope.` };
    if (friendlyValue && ![byId.name, byId.code].some((value) => normalized(value ?? undefined) === normalized(friendlyValue))) {
      return { error: `${label} does not match the supplied ${label.toLowerCase()} ID.` };
    }
    return { row: byId };
  }
  const value = normalized(friendlyValue);
  const matches = rows.filter((row) => normalized(row.name) === value || normalized(row.code ?? undefined) === value);
  if (matches.length === 0) return { error: `${label} "${friendlyValue ?? ""}" was not found in your accessible active records.` };
  if (matches.length > 1) return { error: `${label} "${friendlyValue}" is ambiguous. Use the exact code or a more specific value.` };
  return { row: matches[0] };
}

async function resolveStudentImportRows(user: CurrentUser, parsed: StudentImportParseResult): Promise<ResolvedStudentImportParseResult> {
  const campusScope = user.campusIds?.length
    ? inArray(campuses.id, user.campusIds)
    : user.campusId
      ? eq(campuses.id, user.campusId)
      : undefined;
  const [campusRows, yearRows, classRows, sectionRows] = await Promise.all([
    getDb().select({ id: campuses.id, name: campuses.name, code: campuses.code, campusId: campuses.id }).from(campuses).where(and(eq(campuses.organizationId, user.organizationId), eq(campuses.status, "active"), campusScope)),
    getDb().select({ id: academicYears.id, name: academicYears.name, campusId: academicYears.campusId }).from(academicYears).where(and(eq(academicYears.organizationId, user.organizationId), eq(academicYears.status, "active"), user.campusIds?.length ? inArray(academicYears.campusId, user.campusIds) : user.campusId ? eq(academicYears.campusId, user.campusId) : undefined)),
    getDb().select({ id: classes.id, name: classes.name, code: classes.code, campusId: classes.campusId }).from(classes).where(and(eq(classes.organizationId, user.organizationId), eq(classes.status, "active"), user.campusIds?.length ? inArray(classes.campusId, user.campusIds) : user.campusId ? eq(classes.campusId, user.campusId) : undefined)),
    getDb().select({ id: sections.id, name: sections.name, campusId: sections.campusId, classId: sections.classId }).from(sections).where(and(eq(sections.organizationId, user.organizationId), eq(sections.status, "active"), user.campusIds?.length ? inArray(sections.campusId, user.campusIds) : user.campusId ? eq(sections.campusId, user.campusId) : undefined)),
  ]);
  const validRows: Array<{ rowNumber: number; data: StudentInput }> = [];
  const errors = [...parsed.errors];
  for (const entry of parsed.validRows) {
    const row = entry.data;
    const campusResult = resolveReference("Campus", row.campusId, row.campus, campusRows);
    if (!campusResult.row) {
      errors.push({ row: entry.rowNumber, fields: { campus: [campusResult.error ?? "Campus is invalid."] } });
      continue;
    }
    const campusId = campusResult.row.id;
    const yearResult = resolveReference("Academic year", row.academicYearId, row.academicYear, yearRows.filter((item) => item.campusId === campusId));
    const classResult = resolveReference("Class", row.classId, row.class, classRows.filter((item) => item.campusId === campusId));
    if (!yearResult.row || !classResult.row) {
      const fields: Record<string, string[]> = {};
      if (!yearResult.row) fields.academicYear = [yearResult.error ?? "Academic year is invalid."];
      if (!classResult.row) fields.class = [classResult.error ?? "Class is invalid."];
      errors.push({ row: entry.rowNumber, fields });
      continue;
    }
    const sectionResult = resolveReference("Section", row.sectionId, row.section, sectionRows.filter((item) => item.campusId === campusId && item.classId === classResult.row?.id));
    if (!sectionResult.row) {
      errors.push({ row: entry.rowNumber, fields: { section: [sectionResult.error ?? "Section is invalid for the selected class."] } });
      continue;
    }
    validRows.push({
      rowNumber: entry.rowNumber,
      data: {
        admissionNumber: row.admissionNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        campusId,
        academicYearId: yearResult.row.id,
        classId: classResult.row.id,
        sectionId: sectionResult.row.id,
        rollNumber: row.rollNumber,
        gender: "",
      },
    });
  }
  return { validRows, errors, totalRows: parsed.totalRows };
}

export async function previewStudentImport(user: CurrentUser, csv: string) {
  const raw = parseStudentCsv(csv);
  if (raw.totalRows > MAX_IMPORT_ROWS) throw new AppError("VALIDATION_ERROR", `Imports are limited to ${MAX_IMPORT_ROWS} rows per request.`, 422);
  const parsed = await resolveStudentImportRows(user, raw);
  if (!parsed.validRows.length) return parsed;
  const existingRows = await getDb().select({ admissionNumber: students.admissionNumber }).from(students).where(and(
    eq(students.organizationId, user.organizationId),
    inArray(students.admissionNumber, parsed.validRows.map((entry) => entry.data.admissionNumber)),
  ));
  const existing = new Set(existingRows.map((row) => row.admissionNumber));
  const errors = [...parsed.errors];
  const validRows = parsed.validRows.filter((entry) => {
    if (!existing.has(entry.data.admissionNumber)) return true;
    errors.push({ row: entry.rowNumber, fields: { admissionNumber: ["That admission number is already in use."] } });
    return false;
  });
  return { validRows, errors, totalRows: parsed.totalRows };
}

async function processParsedStudentImport(user: CurrentUser, parsed: ResolvedStudentImportParseResult, importJobId: string) {
  const errors = [...parsed.errors];
  let importedRows = 0;
  await updateImportProgress(user, importJobId, 0, errors.length, "processing", errors);
  for (const [index, entry] of parsed.validRows.entries()) {
    try {
      await createStudentRecord(user, entry.data);
      importedRows += 1;
    } catch (error) {
      errors.push({ row: entry.rowNumber, fields: { row: [error instanceof Error ? error.message : "Unable to import row."] } });
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
  const raw = parseStudentCsv(csv);
  if (raw.totalRows > MAX_IMPORT_ROWS) throw new AppError("VALIDATION_ERROR", `Imports are limited to ${MAX_IMPORT_ROWS} rows per request.`, 422);
  const parsed = await resolveStudentImportRows(user, raw);
  if (options.existingImportJobId) {
    const existingJob = await getDb().query.importJobs.findFirst({ where: and(
      eq(importJobs.id, options.existingImportJobId),
      eq(importJobs.organizationId, user.organizationId),
      eq(importJobs.entityType, "students"),
      user.campusId ? eq(importJobs.campusId, user.campusId) : undefined,
    ) });
    if (!existingJob) throw new AppError("NOT_FOUND", "Queued import job not found.", 404);
    const result = await processParsedStudentImport(user, parsed, existingJob.id);
    await writeAuditLog(user, {
      action: "import",
      module: "students",
      entityType: "import_job",
      entityId: result.job.id,
      campusId: result.job.campusId,
      metadata: { entityType: "students", totalRows: parsed.totalRows, errorRows: result.errors.length, queued: true },
    });
    return { queued: false as const, job: result.job, importJobId: result.job.id, importedRows: result.importedRows, errors: result.errors };
  }
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
