import "server-only";
import { getDb } from "@/db/client";
import { auditLogs } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";
import type { AuditInput } from "./audit-log.types";
import { buildAuditRecord } from "./audit-record";

export type { AuditInput } from "./audit-log.types";

export async function writeAuditLog(user: CurrentUser, input: AuditInput) {
  await getDb().insert(auditLogs).values(buildAuditRecord(user, input));
}
