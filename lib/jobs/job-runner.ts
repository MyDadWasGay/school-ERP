import { logger } from "@/lib/observability/logger";
import {
  claimNextJob,
  completeJob,
  failJob,
  requeueStaleJobs,
  type JobRecord,
} from "./job-store";

async function dispatchJob(job: JobRecord) {
  switch (job.jobType) {
    case "students.import": {
      const { runQueuedStudentImport } = await import("@/features/import-export/services/student-import-job");
      await runQueuedStudentImport(job);
      return;
    }
    default:
      throw new Error(`No handler is registered for job type '${job.jobType}'.`);
  }
}

export async function runNextJob(workerId: string) {
  const requeued = await requeueStaleJobs();
  const job = await claimNextJob(workerId);
  if (!job) return { status: "idle" as const, requeued };
  try {
    await dispatchJob(job);
    const completed = await completeJob(job.id, workerId);
    if (!completed) throw new Error("Job lease was lost before completion.");
    logger.info("job.completed", { jobId: job.id, jobType: job.jobType, organizationId: job.organizationId, attempts: job.attempts });
    return { status: "succeeded" as const, jobId: job.id, jobType: job.jobType, attempts: job.attempts, requeued };
  } catch (error) {
    const failed = await failJob(job, workerId, error);
    logger.error("job.failed", {
      jobId: job.id,
      jobType: job.jobType,
      organizationId: job.organizationId,
      attempts: job.attempts,
      status: failed?.status ?? "unknown",
      error: error instanceof Error ? error.name : "unknown",
    });
    return { status: failed?.status === "dead_letter" ? "dead_letter" as const : "failed" as const, jobId: job.id, jobType: job.jobType, attempts: job.attempts, requeued };
  }
}
