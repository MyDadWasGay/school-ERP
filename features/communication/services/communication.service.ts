import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { messages, notificationEvents, users } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { MessageInput } from "../schemas/communication.schema";

function audienceFor(input: MessageInput) {
  return { type: input.audienceType, role: input.audienceRole || null };
}

export async function listMessages(user: CurrentUser) {
  const rows = await getDb().select().from(messages).where(and(
    eq(messages.organizationId, user.organizationId),
    user.campusId ? eq(messages.campusId, user.campusId) : undefined,
  )).orderBy(desc(messages.createdAt)).limit(200);
  return rows.map((row) => ({
    ...row,
    audience: JSON.parse(row.audienceJson) as { type: string; role: string | null },
  }));
}

export async function createMessage(user: CurrentUser, input: MessageInput) {
  if (input.audienceType === "role" && !input.audienceRole) throw new AppError("VALIDATION_ERROR", "Choose a recipient role.", 400);
  const [row] = await getDb().insert(messages).values({
    id: createId("message"),
    organizationId: user.organizationId,
    campusId: user.campusId,
    subject: input.subject,
    body: input.body,
    audienceJson: JSON.stringify(audienceFor(input)),
    status: "draft",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create message.", 500);
  return row;
}

export async function publishMessage(user: CurrentUser, messageId: string) {
  return getDb().transaction(async (tx) => {
    const message = await tx.query.messages.findFirst({ where: and(
      eq(messages.id, messageId),
      eq(messages.organizationId, user.organizationId),
      user.campusId ? eq(messages.campusId, user.campusId) : undefined,
    ) });
    if (!message) throw new AppError("NOT_FOUND", "Message not found in your campus scope.", 404);
    if (message.status === "published") throw new AppError("CONFLICT", "Message has already been published.", 409);
    const audience = JSON.parse(message.audienceJson) as { type: string; role?: string | null };
    const recipientRows = await tx.select({ id: users.id }).from(users).where(and(
      eq(users.organizationId, user.organizationId),
      eq(users.status, "active"),
      message.campusId ? eq(users.campusId, message.campusId) : undefined,
      audience.type === "role" && audience.role ? eq(users.role, audience.role) : undefined,
    )).limit(5000);
    const now = new Date();
    if (recipientRows.length > 0) {
      await tx.insert(notificationEvents).values(recipientRows.map((recipient) => ({
        id: createId("notification"),
        organizationId: user.organizationId,
        campusId: message.campusId,
        messageId: message.id,
        recipientUserId: recipient.id,
        channel: "in_app",
        payloadJson: JSON.stringify({ subject: message.subject, body: message.body }),
        sentAt: now,
        status: "sent",
        createdBy: user.id,
        updatedBy: user.id,
      })));
    }
    const [published] = await tx.update(messages).set({
      status: "published",
      publishedAt: now,
      updatedAt: now,
      updatedBy: user.id,
    }).where(and(eq(messages.id, message.id), eq(messages.status, "draft"))).returning();
    if (!published) throw new AppError("CONFLICT", "Message changed while it was being published.", 409);
    return { message: published, recipientCount: recipientRows.length };
  });
}

export async function listNotifications(user: CurrentUser) {
  return getDb().select({
    id: notificationEvents.id,
    subject: messages.subject,
    body: messages.body,
    sentAt: notificationEvents.sentAt,
    readAt: notificationEvents.readAt,
    status: notificationEvents.status,
  }).from(notificationEvents).innerJoin(messages, and(
    eq(messages.id, notificationEvents.messageId),
    eq(messages.organizationId, user.organizationId),
  )).where(and(
    eq(notificationEvents.organizationId, user.organizationId),
    eq(notificationEvents.recipientUserId, user.id),
    eq(notificationEvents.channel, "in_app"),
  )).orderBy(desc(notificationEvents.sentAt)).limit(100);
}

export async function markNotificationRead(user: CurrentUser, notificationId: string) {
  const [row] = await getDb().update(notificationEvents).set({
    readAt: new Date(),
    status: "read",
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(
    eq(notificationEvents.id, notificationId),
    eq(notificationEvents.organizationId, user.organizationId),
    eq(notificationEvents.recipientUserId, user.id),
  )).returning();
  if (!row) throw new AppError("NOT_FOUND", "Notification not found.", 404);
  return row;
}

export async function listNotificationDelivery(user: CurrentUser) {
  return getDb().select({
    id: notificationEvents.id,
    recipientUserId: notificationEvents.recipientUserId,
    recipientEmail: users.email,
    subject: messages.subject,
    channel: notificationEvents.channel,
    status: notificationEvents.status,
    sentAt: notificationEvents.sentAt,
  }).from(notificationEvents)
    .leftJoin(users, and(eq(users.id, notificationEvents.recipientUserId), eq(users.organizationId, user.organizationId)))
    .leftJoin(messages, and(eq(messages.id, notificationEvents.messageId), eq(messages.organizationId, user.organizationId)))
    .where(eq(notificationEvents.organizationId, user.organizationId))
    .orderBy(desc(notificationEvents.createdAt), asc(notificationEvents.id)).limit(500);
}
