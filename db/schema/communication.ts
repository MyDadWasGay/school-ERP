import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditColumns, idColumn, tenantColumns, statusColumn } from "./shared";

export const messages = sqliteTable("messages", {
  id: idColumn("message"),
  ...tenantColumns(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audienceJson: text("audience_json").notNull(),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  ...auditColumns(),
  status: statusColumn("draft"),
}, (table) => [index("messages_org_status_idx").on(table.organizationId, table.status)]);

export const notificationEvents = sqliteTable("notification_events", {
  id: idColumn("notification"),
  ...tenantColumns(),
  messageId: text("message_id"),
  recipientUserId: text("recipient_user_id"),
  channel: text("channel").notNull(),
  payloadJson: text("payload_json"),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  readAt: integer("read_at", { mode: "timestamp" }),
  ...auditColumns(),
  status: statusColumn("queued"),
}, (table) => [
  index("notifications_recipient_idx").on(table.organizationId, table.recipientUserId),
  index("notifications_message_idx").on(table.organizationId, table.messageId),
]);
