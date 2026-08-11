
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { goodsReceipts, inventoryItems, purchaseOrders, purchaseRequisitions, stockMovements, suppliers, workflowTransitions } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { GoodsReceiptInput, PurchaseOrderInput, RequisitionInput } from "../schemas/procurement.schema";

const requisitionTransitions: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["converted", "cancelled"],
  rejected: ["draft", "cancelled"],
};

const purchaseOrderTransitions: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "cancelled"],
  approved: ["ordered", "cancelled"],
  ordered: ["partially_received", "received", "cancelled"],
  partially_received: ["received", "cancelled"],
};

function scope(user: CurrentUser, organizationId: string, campusId: string | null) {
  if (organizationId !== user.organizationId) throw new AppError("FORBIDDEN", "Procurement record is outside your organization.", 403);
  if (campusId && user.campusId && campusId !== user.campusId && !user.permissions.includes("organizations:update")) throw new AppError("FORBIDDEN", "Procurement record is outside your campus scope.", 403);
}

export async function listRequisitions(user: CurrentUser) {
  return getDb().select().from(purchaseRequisitions).where(and(
    eq(purchaseRequisitions.organizationId, user.organizationId),
    user.campusId ? eq(purchaseRequisitions.campusId, user.campusId) : undefined,
  )).orderBy(desc(purchaseRequisitions.createdAt)).limit(300);
}

export async function createRequisition(user: CurrentUser, input: RequisitionInput) {
  const [row] = await getDb().insert(purchaseRequisitions).values({
    id: createId("requisition"),
    organizationId: user.organizationId,
    campusId: user.campusId,
    name: input.name,
    code: `REQ-${createId("number").slice(-8).toUpperCase()}`,
    detailsJson: JSON.stringify({ quantity: input.quantity, estimatedMinor: input.estimatedMinor }),
    status: "draft",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create purchase requisition.", 500);
  return row;
}

export async function transitionRequisition(user: CurrentUser, id: string, toStatus: string) {
  const row = await getDb().query.purchaseRequisitions.findFirst({ where: and(
    eq(purchaseRequisitions.id, id),
    eq(purchaseRequisitions.organizationId, user.organizationId),
    user.campusId ? eq(purchaseRequisitions.campusId, user.campusId) : undefined,
  ) });
  if (!row) throw new AppError("NOT_FOUND", "Purchase requisition not found.", 404);
  if (!requisitionTransitions[row.status]?.includes(toStatus)) throw new AppError("CONFLICT", `Cannot move requisition from ${row.status} to ${toStatus}.`, 409);
  const now = new Date();
  return getDb().transaction(async (tx) => {
    const [updated] = await tx.update(purchaseRequisitions).set({ status: toStatus, updatedAt: now, updatedBy: user.id }).where(and(eq(purchaseRequisitions.id, row.id), eq(purchaseRequisitions.status, row.status))).returning();
    if (!updated) throw new AppError("CONFLICT", "Requisition changed before the transition was saved.", 409);
    await tx.insert(workflowTransitions).values({ organizationId: user.organizationId, campusId: row.campusId, entityType: "purchase_requisition", entityId: row.id, fromStatus: row.status, toStatus, transitionedBy: user.id, transitionedAt: now, createdBy: user.id, updatedBy: user.id });
    return updated;
  });
}

export async function listPurchaseOrders(user: CurrentUser) {
  return getDb().select().from(purchaseOrders).where(and(
    eq(purchaseOrders.organizationId, user.organizationId),
    user.campusId ? eq(purchaseOrders.campusId, user.campusId) : undefined,
  )).orderBy(desc(purchaseOrders.createdAt)).limit(300);
}

export async function createPurchaseOrder(user: CurrentUser, input: PurchaseOrderInput) {
  const requisition = await getDb().query.purchaseRequisitions.findFirst({ where: and(
    eq(purchaseRequisitions.id, input.requisitionId),
    eq(purchaseRequisitions.organizationId, user.organizationId),
    user.campusId ? eq(purchaseRequisitions.campusId, user.campusId) : undefined,
    eq(purchaseRequisitions.status, "approved"),
  ) });
  if (!requisition) throw new AppError("CONFLICT", "Only an approved requisition can become a purchase order.", 409);
  const supplier = input.supplierId ? await getDb().query.suppliers.findFirst({ where: and(
    eq(suppliers.id, input.supplierId),
    eq(suppliers.organizationId, user.organizationId),
    user.campusId ? eq(suppliers.campusId, user.campusId) : undefined,
    eq(suppliers.status, "active"),
  ) }) : null;
  if (input.supplierId && !supplier) throw new AppError("NOT_FOUND", "Supplier is not in your campus scope.", 404);
  const supplierName = supplier?.name ?? input.supplierName?.trim();
  if (!supplierName) throw new AppError("VALIDATION_ERROR", "A supplier is required.", 422);
  const [row] = await getDb().insert(purchaseOrders).values({
    id: createId("purchase_order"),
    organizationId: user.organizationId,
    campusId: requisition.campusId,
    name: `PO for ${requisition.name}`,
    code: `PO-${createId("number").slice(-8).toUpperCase()}`,
    referenceId: requisition.id,
    detailsJson: JSON.stringify({ supplierId: supplier?.id ?? null, supplierName, amountMinor: input.amountMinor }),
    status: "draft",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create purchase order.", 500);
  return row;
}

export async function transitionPurchaseOrder(user: CurrentUser, id: string, toStatus: string) {
  const row = await getDb().query.purchaseOrders.findFirst({ where: and(
    eq(purchaseOrders.id, id),
    eq(purchaseOrders.organizationId, user.organizationId),
    user.campusId ? eq(purchaseOrders.campusId, user.campusId) : undefined,
  ) });
  if (!row) throw new AppError("NOT_FOUND", "Purchase order not found.", 404);
  if (!purchaseOrderTransitions[row.status]?.includes(toStatus)) throw new AppError("CONFLICT", `Cannot move purchase order from ${row.status} to ${toStatus}.`, 409);
  const now = new Date();
  return getDb().transaction(async (tx) => {
    const [updated] = await tx.update(purchaseOrders).set({ status: toStatus, updatedAt: now, updatedBy: user.id }).where(and(eq(purchaseOrders.id, row.id), eq(purchaseOrders.status, row.status))).returning();
    if (!updated) throw new AppError("CONFLICT", "Purchase order changed before the transition was saved.", 409);
    await tx.insert(workflowTransitions).values({ organizationId: user.organizationId, campusId: row.campusId, entityType: "purchase_order", entityId: row.id, fromStatus: row.status, toStatus, transitionedBy: user.id, transitionedAt: now, createdBy: user.id, updatedBy: user.id });
    return updated;
  });
}

export async function listGoodsReceipts(user: CurrentUser) {
  return getDb().select({
    id: goodsReceipts.id,
    name: goodsReceipts.name,
    purchaseOrderId: goodsReceipts.referenceId,
    detailsJson: goodsReceipts.detailsJson,
    status: goodsReceipts.status,
    createdAt: goodsReceipts.createdAt,
  }).from(goodsReceipts).where(and(
    eq(goodsReceipts.organizationId, user.organizationId),
    user.campusId ? eq(goodsReceipts.campusId, user.campusId) : undefined,
  )).orderBy(desc(goodsReceipts.createdAt)).limit(300);
}

export async function postGoodsReceipt(user: CurrentUser, input: GoodsReceiptInput) {
  const [order, item] = await Promise.all([
    getDb().query.purchaseOrders.findFirst({ where: and(
      eq(purchaseOrders.id, input.purchaseOrderId),
      eq(purchaseOrders.organizationId, user.organizationId),
      user.campusId ? eq(purchaseOrders.campusId, user.campusId) : undefined,
      eq(purchaseOrders.status, "ordered"),
    ) }),
    getDb().query.inventoryItems.findFirst({ where: and(
      eq(inventoryItems.id, input.inventoryItemId),
      eq(inventoryItems.organizationId, user.organizationId),
      user.campusId ? eq(inventoryItems.campusId, user.campusId) : undefined,
      eq(inventoryItems.status, "active"),
    ) }),
  ]);
  if (!order) throw new AppError("CONFLICT", "Only an ordered purchase order can receive goods.", 409);
  if (!item) throw new AppError("NOT_FOUND", "Inventory item not found in your scope.", 404);
  const now = new Date();
  return getDb().transaction(async (tx) => {
    const [updatedItem] = await tx.update(inventoryItems).set({
      quantity: sql`${inventoryItems.quantity} + ${input.quantity}`,
      updatedAt: now,
      updatedBy: user.id,
    }).where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.organizationId, user.organizationId))).returning();
    if (!updatedItem) throw new AppError("CONFLICT", "Inventory changed before goods receipt was posted.", 409);
    const [movement] = await tx.insert(stockMovements).values({
      id: createId("stock_movement"), organizationId: user.organizationId, campusId: item.campusId,
      inventoryItemId: item.id, quantity: input.quantity, direction: "in", reference: order.code ?? order.id,
      status: "posted", createdBy: user.id, updatedBy: user.id,
    }).returning();
    if (!movement) throw new AppError("DATABASE_ERROR", "Unable to record receipt movement.", 500);
    const [receipt] = await tx.insert(goodsReceipts).values({
      id: createId("goods_receipt"), organizationId: user.organizationId, campusId: order.campusId,
      name: `Receipt for ${order.name}`, referenceId: order.id,
      detailsJson: JSON.stringify({ inventoryItemId: item.id, quantity: input.quantity, stockMovementId: movement.id }),
      status: "posted", createdBy: user.id, updatedBy: user.id,
    }).returning();
    if (!receipt) throw new AppError("DATABASE_ERROR", "Unable to record goods receipt.", 500);
    const [updatedOrder] = await tx.update(purchaseOrders).set({ status: "received", updatedAt: now, updatedBy: user.id }).where(and(eq(purchaseOrders.id, order.id), eq(purchaseOrders.status, "ordered"))).returning();
    if (!updatedOrder) throw new AppError("CONFLICT", "Purchase order changed before receipt completion.", 409);
    return { receipt, movement, item: updatedItem, order: updatedOrder };
  });
}

export function assertProcurementScope(user: CurrentUser, row: { organizationId: string; campusId: string | null }) { scope(user, row.organizationId, row.campusId); }
