"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { canteenTransactionSchema, menuSchema } from "../schemas/canteen.schema";
import { createCanteenTransaction, createMenu } from "../services/canteen.service";

export async function createMenuAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = menuSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Menu details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("canteen:create"); const row = await createMenu(user, parsed.data); await writeAuditLog(user, { action: "create", module: "canteen", entityType: "mess_menu", entityId: row.id, campusId: row.campusId, after: { name: row.name } }); revalidatePath("/canteen/menu"); revalidatePath("/canteen/transactions"); return { ok: true, data: { id: row.id }, message: "Menu item created." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create menu item." }; }
}

export async function createCanteenTransactionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = canteenTransactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Transaction details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("canteen:update"); const row = await createCanteenTransaction(user, parsed.data); await writeAuditLog(user, { action: "create", module: "canteen", entityType: "canteen_transaction", entityId: row.id, campusId: row.campusId, after: { menuId: parsed.data.menuId, studentId: parsed.data.studentId, quantity: parsed.data.quantity } }); revalidatePath("/canteen/transactions"); return { ok: true, data: { id: row.id }, message: "Canteen transaction recorded." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to record transaction." }; }
}
