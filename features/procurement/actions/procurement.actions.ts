"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { goodsReceiptSchema, purchaseOrderSchema, requisitionSchema, workflowTransitionSchema } from "../schemas/procurement.schema";
import { createPurchaseOrder, createRequisition, postGoodsReceipt, transitionPurchaseOrder, transitionRequisition } from "../services/procurement.service";

export async function createRequisitionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = requisitionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Requisition details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("procurement:create"); const row = await createRequisition(user, parsed.data); await writeAuditLog(user, { action: "create", module: "procurement", entityType: "purchase_requisition", entityId: row.id, campusId: row.campusId, after: { name: row.name, status: row.status } }); revalidatePath("/procurement/requisitions"); revalidatePath("/procurement/purchase-orders"); return { ok: true, data: { id: row.id }, message: "Requisition created as draft." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create requisition." }; }
}

export async function transitionRequisitionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = workflowTransitionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Transition details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("procurement:approve"); const row = await transitionRequisition(user, parsed.data.id, parsed.data.toStatus); await writeAuditLog(user, { action: "update", module: "procurement", entityType: "purchase_requisition", entityId: row.id, campusId: row.campusId, after: { status: row.status } }); revalidatePath("/procurement/requisitions"); revalidatePath("/procurement/purchase-orders"); return { ok: true, data: { id: row.id }, message: `Requisition moved to ${row.status}.` }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to transition requisition." }; }
}

export async function createPurchaseOrderAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = purchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Purchase order details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("procurement:create"); const row = await createPurchaseOrder(user, parsed.data); await writeAuditLog(user, { action: "create", module: "procurement", entityType: "purchase_order", entityId: row.id, campusId: row.campusId, after: { name: row.name, status: row.status, requisitionId: row.referenceId } }); revalidatePath("/procurement/purchase-orders"); return { ok: true, data: { id: row.id }, message: "Purchase order created as draft." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create purchase order." }; }
}

export async function transitionPurchaseOrderAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = workflowTransitionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Transition details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("procurement:approve"); const row = await transitionPurchaseOrder(user, parsed.data.id, parsed.data.toStatus); await writeAuditLog(user, { action: "update", module: "procurement", entityType: "purchase_order", entityId: row.id, campusId: row.campusId, after: { status: row.status } }); revalidatePath("/procurement/purchase-orders"); return { ok: true, data: { id: row.id }, message: `Purchase order moved to ${row.status}.` }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to transition purchase order." }; }
}

export async function postGoodsReceiptAction(input: unknown): Promise<ActionResult<{ id: string; quantity: number }>> {
  const parsed = goodsReceiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Goods receipt details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("procurement:update"); const result = await postGoodsReceipt(user, parsed.data); await writeAuditLog(user, { action: "update", module: "procurement", entityType: "goods_receipt", entityId: result.receipt.id, campusId: result.receipt.campusId, after: { purchaseOrderId: parsed.data.purchaseOrderId, inventoryItemId: parsed.data.inventoryItemId, quantity: parsed.data.quantity, stockMovementId: result.movement.id } }); revalidatePath("/procurement/goods-receipts"); revalidatePath("/procurement/purchase-orders"); revalidatePath("/inventory/items"); revalidatePath("/inventory/stock-movements"); return { ok: true, data: { id: result.receipt.id, quantity: result.item.quantity }, message: `Goods received. Current stock: ${result.item.quantity}.` }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to post goods receipt." }; }
}
