import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, statusColumn, tenantColumns } from "./shared";

/**
 * Typed extension table used for lower-risk first-build entities. Workflows
 * graduate to dedicated schemas when they need transactional invariants.
 */
export function catalogTable(tableName: string, prefix: string) {
  return sqliteTable(tableName, {
    id: idColumn(prefix),
    ...tenantColumns(),
    name: text("name").notNull(),
    code: text("code"),
    referenceId: text("reference_id"),
    effectiveAt: integer("effective_at", { mode: "timestamp" }),
    detailsJson: text("details_json"),
    ...auditColumns(),
    status: statusColumn("draft"),
  }, (table) => [
    index(`${tableName}_scope_idx`).on(table.organizationId, table.campusId, table.status),
    index(`${tableName}_reference_idx`).on(table.organizationId, table.referenceId),
  ]);
}
