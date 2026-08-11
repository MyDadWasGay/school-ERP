import { z } from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(2).max(80),
  reorderLevel: z.coerce.number().int().min(0).max(10_000_000).default(0),
});

export const stockMovementSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10_000_000),
  direction: z.enum(["in", "out"]),
  reference: z.string().trim().max(160).optional(),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(2).max(160),
  contactEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export const supplierUpdateSchema = supplierSchema.extend({
  id: z.string().min(1),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
