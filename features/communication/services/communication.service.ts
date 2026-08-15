import { and, asc, count, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { messages, mobileDeviceRegistrations, notificationEvents, users } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import { normalizePagination } from "@/lib/utils/pagination";
import { FcmProvider } from "@/lib/integrations/selected-providers";
import type { MobileDeviceInput } from "../schemas/device.schema";
import type { MessageInput } from "../schemas/communication.schema";

function audienceFor(input: MessageInput) {
  return { type: input.audienceType, role: input.audienceRole || null, userIds: input.recipientUserIds ?? [] };
}

export async function listMessages(user: CurrentUser) {
  const rows = await getDb().select().from(messages).where(and(
    eq(messages.organizationId, user.organizationId),
    user.campusId ? eq(messages.campusId, user.campusId) : undefined,
  )).orderBy(desc(messages.createdAt)).limit(200);
  const canManage = user.permissions.includes("*") || user.permissions.includes("communication:update");
  return rows.flatMap((row) => {
    const audience = JSON.parse(row.audienceJson) as { type: string; role: string | null; userIds?: string[] };
    const isOwner = row.createdBy === user.id;
    const canReadPublished = row.status === "published" && (
      audience.type === "all" ||
      (audience.type === "role" && audience.role === user.role) ||
      (audience.type === "users" && audience.userIds?.includes(user.id) === true)
    );
    if (!canManage && !isOwner && !canReadPublished) return [];
    return [{ ...row, audience }];
  });
}

export async function createMessage(user: CurrentUser, input: MessageInput) {
  if (input.audienceType === "users") {
    const recipientIds = [...new Set(input.recipientUserIds ?? [])];
    const rows = await getDb().select({ id: users.id }).from(users).where(and(
      eq(users.organizationId, user.organizationId),
      eq(users.status, "active"),
      inArray(users.id, recipientIds),
      user.campusId ? eq(users.campusId, user.campusId) : undefined,
      eq(users.id, user.id),
    ));
    if (rows.some((row) => row.id === user.id)) throw new AppError("VALIDATION_ERROR", "You cannot message yourself.", 422);
    const scopedRows = await getDb().select({ id: users.id }).from(users).where(and(
      eq(users.organizationId, user.organizationId),
      eq(users.status, "active"),
      inArray(users.id, recipientIds),
      user.campusId ? eq(users.campusId, user.campusId) : undefined,
    ));
    if (scopedRows.length !== recipientIds.length) throw new AppError("TENANT_SCOPE_ERROR", "One or more recipients are outside your campus scope.", 403);
  }
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
  const result = await getDb().transaction(async (tx) => {
    const message = await tx.query.messages.findFirst({ where: and(
      eq(messages.id, messageId),
      eq(messages.organizationId, user.organizationId),
      user.campusId ? eq(messages.campusId, user.campusId) : undefined,
    ) });
    if (!message) throw new AppError("NOT_FOUND", "Message not found in your campus scope.", 404);
    if (message.status === "published") throw new AppError("CONFLICT", "Message has already been published.", 409);
    const audience = JSON.parse(message.audienceJson) as { type: string; role?: string | null; userIds?: string[] };
    const recipientRows = await tx.select({ id: users.id }).from(users).where(and(
      eq(users.organizationId, user.organizationId),
      eq(users.status, "active"),
      message.campusId ? eq(users.campusId, message.campusId) : undefined,
      audience.type === "role" && audience.role ? eq(users.role, audience.role) : undefined,
      audience.type === "users" && audience.userIds?.length ? inArray(users.id, audience.userIds) : undefined,
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
    return {
      message: published,
      recipientCount: recipientRows.length,
      recipientUserIds: recipientRows.map((recipient) => recipient.id),
    };
  });
  const push = await sendMessagePush(result.recipientUserIds, result.message.subject, result.message.body, result.message.id);
  return { ...result, push };
}

export async function registerMobileDevice(user: CurrentUser, input: MobileDeviceInput) {
  const now = new Date();
  // A Firebase token identifies an installation, not a durable user identity.
  // Revoke any previous owner before attaching it to the current account so a
  // shared device cannot continue receiving another user's notifications.
  await getDb().update(mobileDeviceRegistrations).set({
    status: "revoked",
    updatedAt: now,
    updatedBy: user.id,
  }).where(and(
    eq(mobileDeviceRegistrations.organizationId, user.organizationId),
    eq(mobileDeviceRegistrations.token, input.token),
    ne(mobileDeviceRegistrations.userId, user.id),
    eq(mobileDeviceRegistrations.status, "active"),
  ));
  const existing = await getDb().query.mobileDeviceRegistrations.findFirst({
    where: and(
      eq(mobileDeviceRegistrations.organizationId, user.organizationId),
      eq(mobileDeviceRegistrations.userId, user.id),
      eq(mobileDeviceRegistrations.token, input.token),
    ),
  });
  if (existing) {
    const [updated] = await getDb().update(mobileDeviceRegistrations).set({
      campusId: user.campusId ?? null,
      platform: input.platform,
      appVersion: input.appVersion || null,
      lastSeenAt: now,
      status: "active",
      updatedAt: now,
      updatedBy: user.id,
    }).where(eq(mobileDeviceRegistrations.id, existing.id)).returning();
    if (updated) return updated;
  }
  const [created] = await getDb().insert(mobileDeviceRegistrations).values({
    id: createId("mobile_device"),
    organizationId: user.organizationId,
    campusId: user.campusId ?? null,
    userId: user.id,
    token: input.token,
    platform: input.platform,
    appVersion: input.appVersion || null,
    lastSeenAt: now,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!created) throw new AppError("DATABASE_ERROR", "Unable to register the mobile device.", 500);
  return created;
}

export async function unregisterMobileDevice(user: CurrentUser, token: string) {
  const [updated] = await getDb().update(mobileDeviceRegistrations).set({
    status: "revoked",
    updatedAt: new Date(),
    updatedBy: user.id,
  }).where(and(
    eq(mobileDeviceRegistrations.organizationId, user.organizationId),
    eq(mobileDeviceRegistrations.userId, user.id),
    eq(mobileDeviceRegistrations.token, token),
  )).returning({ id: mobileDeviceRegistrations.id });
  return updated ?? null;
}

async function sendMessagePush(recipientUserIds: string[], subject: string, body: string, messageId: string) {
  if (!recipientUserIds.length) return { accepted: false, reason: "no_recipients" as const };
  const rows = await getDb().select({ token: mobileDeviceRegistrations.token }).from(mobileDeviceRegistrations).where(and(
    inArray(mobileDeviceRegistrations.userId, recipientUserIds),
    eq(mobileDeviceRegistrations.status, "active"),
  ));
  const tokens = [...new Set(rows.map((row) => row.token))];
  if (!tokens.length) return { accepted: false, reason: "no_registered_devices" as const };
  try {
    const result = await new FcmProvider().send({
      tokens,
      title: subject,
      body,
      data: { messageId, kind: "communication" },
    });
    return { accepted: result.accepted, successCount: result.successCount, failureCount: result.failureCount };
  } catch {
    return { accepted: false, reason: "push_provider_failed" as const };
  }
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

export async function listMessageRecipients(user: CurrentUser) {
  const allowedRoles = user.role === "student" || user.role === "parent"
    ? ["teacher", "office_staff", "principal"]
    : ["teacher", "parent", "student", "office_staff", "principal", "accountant"];
  return getDb().select({
    id: users.id,
    name: users.displayName,
    role: users.role,
  }).from(users).where(and(
    eq(users.organizationId, user.organizationId),
    eq(users.status, "active"),
    inArray(users.role, allowedRoles),
    ne(users.id, user.id),
    user.campusId ? eq(users.campusId, user.campusId) : undefined,
  )).orderBy(users.displayName).limit(250);
}

export async function listNotificationsPage(
  user: CurrentUser,
  input?: { page?: number; pageSize?: number },
) {
  const pagination = normalizePagination(input);
  const where = and(
    eq(notificationEvents.organizationId, user.organizationId),
    eq(notificationEvents.recipientUserId, user.id),
    eq(notificationEvents.channel, "in_app"),
  );
  const [rows, totals] = await Promise.all([
    getDb()
      .select({
        id: notificationEvents.id,
        subject: messages.subject,
        body: messages.body,
        sentAt: notificationEvents.sentAt,
        readAt: notificationEvents.readAt,
        status: notificationEvents.status,
      })
      .from(notificationEvents)
      .innerJoin(
        messages,
        and(
          eq(messages.id, notificationEvents.messageId),
          eq(messages.organizationId, user.organizationId),
        ),
      )
      .where(where)
      .orderBy(desc(notificationEvents.sentAt))
      .limit(pagination.pageSize)
      .offset(pagination.offset),
    getDb()
      .select({ value: count() })
      .from(notificationEvents)
      .where(where),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    rows: rows.map((row) => ({
      ...row,
      sentAt: row.sentAt?.toISOString() ?? null,
      readAt: row.readAt?.toISOString() ?? null,
    })),
    pageInfo: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pageCount: Math.ceil(total / pagination.pageSize),
    },
  };
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
