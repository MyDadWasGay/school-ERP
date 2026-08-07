import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns } from "./shared";

export const auditLogs = sqliteTable("audit_logs", {
  id: idColumn("audit"), ...tenantColumns(), actorUserId: text("actor_user_id"), actorRole: text("actor_role"), action: text("action").notNull(), module: text("module").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id"), beforeJson: text("before_json"), afterJson: text("after_json"), metadataJson: text("metadata_json"), ipAddress: text("ip_address"), userAgent: text("user_agent"), ...auditColumns(),
}, (table) => [index("audit_org_created_idx").on(table.organizationId, table.createdAt), index("audit_entity_idx").on(table.organizationId, table.entityType, table.entityId)]);

export const platformAuditLogs = sqliteTable("platform_audit_logs", {
  id: idColumn("platform_audit"), actorUserId: text("actor_user_id"), actorRole: text("actor_role").notNull(), action: text("action").notNull(), module: text("module").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id"), beforeJson: text("before_json"), afterJson: text("after_json"), metadataJson: text("metadata_json"), ipAddress: text("ip_address"), userAgent: text("user_agent"), ...auditColumns(),
}, (table) => [index("platform_audit_created_idx").on(table.createdAt), index("platform_audit_entity_idx").on(table.entityType, table.entityId)]);
