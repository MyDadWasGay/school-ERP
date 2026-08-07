import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

/**
 * Durable tenant-scoped work items. A worker claims a row, increments
 * attempts, and either completes it or moves it through retry/dead-letter
 * states. Payloads are opaque to the database and sensitive payloads must be
 * encrypted by the feature that creates the job.
 */
export const jobRuns = sqliteTable("job_runs", {
  id: idColumn("job"),
  ...tenantColumns(),
  jobType: text("job_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: statusColumn("queued"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  runAfter: integer("run_after", { mode: "timestamp" }).notNull(),
  lockedAt: integer("locked_at", { mode: "timestamp" }),
  lockedBy: text("locked_by"),
  lastError: text("last_error"),
  idempotencyKey: text("idempotency_key"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  ...auditColumns(),
}, (table) => [
  index("job_runs_due_idx").on(table.status, table.runAfter),
  index("job_runs_tenant_status_idx").on(table.organizationId, table.status, table.createdAt),
  uniqueIndex("job_runs_tenant_idempotency_idx").on(table.organizationId, table.idempotencyKey),
]);

