import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

/**
 * Persisted extension records back first-build module surfaces. Core financial,
 * student, attendance and assessment workflows keep dedicated typed tables.
 */
export const moduleRecords = sqliteTable("module_records", {
  id: idColumn("record"),
  ...tenantColumns(),
  module: text("module").notNull(),
  route: text("route").notNull(),
  entityType: text("entity_type").notNull(),
  name: text("name").notNull(),
  note: text("note"),
  dataJson: text("data_json"),
  ownerUserId: text("owner_user_id"),
  ...auditColumns(),
  status: statusColumn("draft"),
}, (table) => [
  index("module_records_scope_idx").on(table.organizationId, table.campusId, table.module, table.route),
  index("module_records_status_idx").on(table.organizationId, table.module, table.status),
]);

export const workflowTransitions = sqliteTable("workflow_transitions", {
  id: idColumn("transition"),
  ...tenantColumns(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  transitionedBy: text("transitioned_by").notNull(),
  transitionedAt: integer("transitioned_at", { mode: "timestamp" }).notNull(),
  ...auditColumns(),
}, (table) => [index("workflow_transition_entity_idx").on(table.organizationId, table.entityType, table.entityId)]);
