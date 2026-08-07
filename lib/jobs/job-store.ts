import "server-only";

import { and, asc, desc, eq, lt, lte, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobRuns } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/app-error";
import { createId } from "@/lib/utils/ids";

export const JOB_STATUSES = ["queued", "running", "failed", "succeeded", "dead_letter"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobRecord = typeof jobRuns.$inferSelect;

export type EnqueueJobInput = {
  jobType: string;
  payloadJson: string;
  campusId?: string;
  idempotencyKey?: string;
  maxAttempts?: number;
  runAfter?: Date;
};

export function calculateJobBackoffMs(attempt: number) {
  const normalizedAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(15 * 60_000, 30_000 * 2 ** (normalizedAttempt - 1));
}

export async function enqueueJob(user: CurrentUser, input: EnqueueJobInput) {
  if (!input.jobType.trim() || input.jobType.length > 120) {
    throw new AppError("VALIDATION_ERROR", "Job type is invalid.", 422);
  }
  if (input.payloadJson.length > 8_000_000) {
    throw new AppError("VALIDATION_ERROR", "Job payload is too large.", 422);
  }
  const maxAttempts = Math.min(10, Math.max(1, Math.floor(input.maxAttempts ?? 5)));
  return getDb().transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.query.jobRuns.findFirst({ where: and(
        eq(jobRuns.organizationId, user.organizationId),
        eq(jobRuns.idempotencyKey, input.idempotencyKey),
      ) });
      if (existing) return existing;
    }
    const [row] = await tx.insert(jobRuns).values({
      id: createId("job"),
      organizationId: user.organizationId,
      campusId: input.campusId ?? user.campusId,
      jobType: input.jobType,
      payloadJson: input.payloadJson,
      status: "queued",
      attempts: 0,
      maxAttempts,
      runAfter: input.runAfter ?? new Date(),
      idempotencyKey: input.idempotencyKey,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    if (!row) throw new AppError("DATABASE_ERROR", "Unable to enqueue job.", 500);
    return row;
  });
}

export async function listJobRuns(user: CurrentUser, limit = 100) {
  const rows = await getDb().select({
    id: jobRuns.id,
    jobType: jobRuns.jobType,
    status: jobRuns.status,
    attempts: jobRuns.attempts,
    maxAttempts: jobRuns.maxAttempts,
    runAfter: jobRuns.runAfter,
    lastError: jobRuns.lastError,
    createdAt: jobRuns.createdAt,
    completedAt: jobRuns.completedAt,
  }).from(jobRuns).where(and(
    eq(jobRuns.organizationId, user.organizationId),
    user.campusId ? eq(jobRuns.campusId, user.campusId) : undefined,
  )).orderBy(desc(jobRuns.createdAt)).limit(Math.min(200, Math.max(1, limit)));
  return rows.map((row) => ({
    ...row,
    runAfter: row.runAfter.toISOString(),
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }));
}

export async function requeueStaleJobs(now = new Date(), staleAfterMs = 15 * 60_000) {
  const staleBefore = new Date(now.getTime() - staleAfterMs);
  const result = await getDb().update(jobRuns).set({
    status: "failed",
    lockedAt: null,
    lockedBy: null,
    lastError: "Worker lease expired before completion.",
    runAfter: now,
    updatedAt: now,
  }).where(and(eq(jobRuns.status, "running"), lt(jobRuns.lockedAt, staleBefore)));
  return result.rowsAffected ?? 0;
}

export async function claimNextJob(workerId: string, now = new Date()): Promise<JobRecord | null> {
  const candidate = await getDb().query.jobRuns.findFirst({ where: and(
    lte(jobRuns.runAfter, now),
    or(
      and(eq(jobRuns.status, "queued"), lt(jobRuns.attempts, jobRuns.maxAttempts)),
      and(eq(jobRuns.status, "failed"), lt(jobRuns.attempts, jobRuns.maxAttempts)),
    ),
  ), orderBy: [asc(jobRuns.runAfter), asc(jobRuns.createdAt)] });
  if (!candidate) return null;
  const [claimed] = await getDb().update(jobRuns).set({
    status: "running",
    attempts: candidate.attempts + 1,
    lockedAt: now,
    lockedBy: workerId,
    updatedAt: now,
  }).where(and(
    eq(jobRuns.id, candidate.id),
    or(eq(jobRuns.status, "queued"), eq(jobRuns.status, "failed")),
    lte(jobRuns.runAfter, now),
    lt(jobRuns.attempts, jobRuns.maxAttempts),
  )).returning();
  return claimed ?? null;
}

export async function completeJob(jobId: string, workerId: string, completedAt = new Date()) {
  const [row] = await getDb().update(jobRuns).set({
    status: "succeeded",
    lockedAt: null,
    lockedBy: null,
    lastError: null,
    completedAt,
    updatedAt: completedAt,
  }).where(and(eq(jobRuns.id, jobId), eq(jobRuns.status, "running"), eq(jobRuns.lockedBy, workerId))).returning();
  return row ?? null;
}

export async function failJob(job: JobRecord, workerId: string, error: unknown, failedAt = new Date()) {
  const message = (error instanceof Error ? error.message : "Job failed.").replace(/[\r\n]+/g, " ").slice(0, 1_000);
  const terminal = job.attempts >= job.maxAttempts;
  const [row] = await getDb().update(jobRuns).set({
    status: terminal ? "dead_letter" : "failed",
    lockedAt: null,
    lockedBy: null,
    lastError: message,
    runAfter: terminal ? failedAt : new Date(failedAt.getTime() + calculateJobBackoffMs(job.attempts)),
    updatedAt: failedAt,
  }).where(and(eq(jobRuns.id, job.id), eq(jobRuns.status, "running"), eq(jobRuns.lockedBy, workerId))).returning();
  return row ?? null;
}
