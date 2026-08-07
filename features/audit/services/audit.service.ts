import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/types";

export async function listAuditLogs(user: CurrentUser, limit = 100) {
  const rows = await getDb().select().from(auditLogs).where(and(
    eq(auditLogs.organizationId, user.organizationId),
    user.campusId ? eq(auditLogs.campusId, user.campusId) : undefined,
  )).orderBy(desc(auditLogs.createdAt)).limit(Math.min(limit, 250));
  return rows.map((row) => ({
    id: row.id,
    action: row.action.replaceAll("_", " "),
    entity: `${row.entityType.replaceAll("_", " ")}${row.entityId ? ` · ${row.entityId}` : ""}`,
    actor: row.actorRole?.replaceAll("_", " ") ?? "System",
    occurredAt: row.createdAt.toLocaleString(),
  }));
}
