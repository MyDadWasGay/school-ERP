import { z } from "zod";

export const requisitionSchema = z.object({
  name: z.string().trim().min(2).max(160),
  quantity: z.coerce.number().int().min(1).max(10_000_000),
  estimatedMinor: z.coerce.number().int().min(0).max(2_000_000_000),
});

export const purchaseOrderSchema = z.object({
  requisitionId: z.string().min(1),
  supplierId: z.string().trim().min(1).optional().or(z.literal("")),
  supplierName: z.string().trim().min(2).max(160).optional().or(z.literal("")),
  amountMinor: z.coerce.number().int().min(0).max(2_000_000_000),
}).refine((value) => Boolean(value.supplierId || value.supplierName), { message: "Choose a supplier or enter a supplier name.", path: ["supplierId"] });

export const workflowTransitionSchema = z.object({
  id: z.string().min(1),
  toStatus: z.string().trim().min(2).max(40),
});

export const goodsReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10_000_000),
});

export type RequisitionInput = z.infer<typeof requisitionSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type WorkflowTransitionInput = z.infer<typeof workflowTransitionSchema>;
export type GoodsReceiptInput = z.infer<typeof goodsReceiptSchema>;
