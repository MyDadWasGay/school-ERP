"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { inventoryItemSchema, stockMovementSchema } from "../schemas/inventory.schema";
import { createInventoryItem, postStockMovement } from "../services/inventory.service";

export async function createInventoryItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = inventoryItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inventory item details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("inventory:create");
    const row = await createInventoryItem(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "inventory", entityType: "inventory_item", entityId: row.id, campusId: row.campusId, after: { name: row.name, sku: row.sku, reorderLevel: row.reorderLevel } });
    revalidatePath("/inventory/items");
    revalidatePath("/inventory/stock-movements");
    return { ok: true, data: { id: row.id }, message: "Inventory item created." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create inventory item." }; }
}

export async function postStockMovementAction(input: unknown): Promise<ActionResult<{ id: string; quantity: number }>> {
  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Stock movement details are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("inventory:update");
    const result = await postStockMovement(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "inventory", entityType: "stock_movement", entityId: result.movement.id, campusId: result.movement.campusId, metadata: { direction: result.movement.direction, quantity: result.movement.quantity, inventoryItemId: result.movement.inventoryItemId } });
    revalidatePath("/inventory/items");
    revalidatePath("/inventory/stock-movements");
    revalidatePath("/alerts");
    return { ok: true, data: { id: result.movement.id, quantity: result.item.quantity }, message: `Movement posted. Current quantity: ${result.item.quantity}.` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to post stock movement." }; }
}

