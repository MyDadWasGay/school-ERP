"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { messageSchema } from "../schemas/communication.schema";
import { createMessage, markNotificationRead, publishMessage } from "../services/communication.service";

export async function createMessageAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Message details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("communication:create");
    const row = await createMessage(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "communication", entityType: "message", entityId: row.id, campusId: row.campusId, after: { subject: row.subject, status: row.status } });
    revalidatePath("/communication/messages");
    return { ok: true, data: { id: row.id }, message: "Message saved as a draft." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create message." }; }
}

export async function publishMessageAction(input: unknown): Promise<ActionResult<{ id: string; recipientCount: number }>> {
  const messageId = typeof input === "object" && input !== null && "messageId" in input && typeof input.messageId === "string" ? input.messageId : "";
  if (!messageId) return { ok: false, error: "Message is required.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("communication:update");
    const result = await publishMessage(user, messageId);
    await writeAuditLog(user, { action: "update", module: "communication", entityType: "message", entityId: result.message.id, campusId: result.message.campusId, after: { status: result.message.status, recipientCount: result.recipientCount } });
    revalidatePath("/communication/messages");
    revalidatePath("/communication/logs");
    return { ok: true, data: { id: result.message.id, recipientCount: result.recipientCount }, message: `Published to ${result.recipientCount} in-app recipient(s).` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to publish message." }; }
}

export async function markNotificationReadAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const notificationId = typeof input === "object" && input !== null && "notificationId" in input && typeof input.notificationId === "string" ? input.notificationId : "";
  if (!notificationId) return { ok: false, error: "Notification is required.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("communication:read");
    const row = await markNotificationRead(user, notificationId);
    revalidatePath("/communication/notifications");
    return { ok: true, data: { id: row.id }, message: "Notification marked read." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to mark notification read." }; }
}
