import "server-only";

import { and, asc, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { alerts, inventoryItems, stockMovements } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type { InventoryItemInput, StockMovementInput } from "../schemas/inventory.schema";

export async function listInventoryItems(user: CurrentUser, search?: string) {
  const query = search?.trim();
  return getDb().select().from(inventoryItems).where(and(
    eq(inventoryItems.organizationId, user.organizationId),
    user.campusId ? eq(inventoryItems.campusId, user.campusId) : undefined,
    eq(inventoryItems.status, "active"),
    query ? or(like(inventoryItems.name, `%${query}%`), like(inventoryItems.sku, `%${query}%`)) : undefined,
  )).orderBy(asc(inventoryItems.name)).limit(500);
}

export async function createInventoryItem(user: CurrentUser, input: InventoryItemInput) {
  const [row] = await getDb().insert(inventoryItems).values({
    id: createId("inventory"),
    organizationId: user.organizationId,
    campusId: user.campusId,
    name: input.name,
    sku: input.sku,
    quantity: 0,
    reorderLevel: input.reorderLevel,
    status: "active",
    createdBy: user.id,
    updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create inventory item.", 500);
  return row;
}

export async function postStockMovement(user: CurrentUser, input: StockMovementInput) {
  const item = await getDb().query.inventoryItems.findFirst({ where: and(
    eq(inventoryItems.id, input.inventoryItemId),
    eq(inventoryItems.organizationId, user.organizationId),
    user.campusId ? eq(inventoryItems.campusId, user.campusId) : undefined,
    eq(inventoryItems.status, "active"),
  ) });
  if (!item) throw new AppError("NOT_FOUND", "Inventory item not found.", 404);
  if (input.direction === "out" && item.quantity < input.quantity) {
    throw new AppError("CONFLICT", `Only ${item.quantity} units are available.`, 409);
  }
  const delta = input.direction === "in" ? input.quantity : -input.quantity;
  return getDb().transaction(async (tx) => {
    const [updatedItem] = await tx.update(inventoryItems).set({
      quantity: sql`${inventoryItems.quantity} + ${delta}`,
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(and(
      eq(inventoryItems.id, item.id),
      eq(inventoryItems.organizationId, user.organizationId),
      input.direction === "out" ? gte(inventoryItems.quantity, input.quantity) : undefined,
    )).returning();
    if (!updatedItem) throw new AppError("CONFLICT", "Inventory quantity changed before the movement was posted.", 409);
    const [movement] = await tx.insert(stockMovements).values({
      id: createId("stock_movement"),
      organizationId: user.organizationId,
      campusId: item.campusId,
      inventoryItemId: item.id,
      quantity: input.quantity,
      direction: input.direction,
      reference: input.reference || null,
      status: "posted",
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    if (!movement) throw new AppError("DATABASE_ERROR", "Unable to record stock movement.", 500);
    if (updatedItem.quantity <= updatedItem.reorderLevel) {
      const existingAlert = await tx.query.alerts.findFirst({ where: and(
        eq(alerts.organizationId, user.organizationId),
        eq(alerts.type, "inventory_low_stock"),
        eq(alerts.sourceId, item.id),
        eq(alerts.status, "open"),
      ) });
      if (!existingAlert) {
        await tx.insert(alerts).values({
          id: createId("alert"),
          organizationId: user.organizationId,
          campusId: item.campusId,
          type: "inventory_low_stock",
          title: `Low stock: ${updatedItem.name}`,
          sourceType: "inventory_item",
          sourceId: item.id,
          status: "open",
          createdBy: user.id,
          updatedBy: user.id,
        });
      }
    }
    return { item: updatedItem, movement };
  });
}

export async function listStockMovements(user: CurrentUser) {
  const rows = await getDb().select({
    id: stockMovements.id,
    quantity: stockMovements.quantity,
    direction: stockMovements.direction,
    reference: stockMovements.reference,
    createdAt: stockMovements.createdAt,
    itemName: inventoryItems.name,
    sku: inventoryItems.sku,
  }).from(stockMovements).innerJoin(inventoryItems, and(
    eq(inventoryItems.id, stockMovements.inventoryItemId),
    eq(inventoryItems.organizationId, user.organizationId),
  )).where(and(
    eq(stockMovements.organizationId, user.organizationId),
    user.campusId ? eq(stockMovements.campusId, user.campusId) : undefined,
  )).orderBy(desc(stockMovements.createdAt)).limit(500);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

