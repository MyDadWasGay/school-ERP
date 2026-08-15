import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
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

export const mobileDeviceRegistrations = sqliteTable("mobile_device_registrations", {
  id: idColumn("mobile_device"),
  ...tenantColumns(),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  platform: text("platform").notNull(),
  appVersion: text("app_version"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
  ...auditColumns(),
  status: statusColumn("active"),
}, (table) => [
  uniqueIndex("mobile_devices_org_user_token_unique").on(table.organizationId, table.userId, table.token),
  index("mobile_devices_user_idx").on(table.organizationId, table.userId, table.status),
]);
