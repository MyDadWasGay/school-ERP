import { z } from "zod";

export const menuSchema = z.object({
  name: z.string().trim().min(2).max(160),
  priceMinor: z.coerce.number().int().min(0).max(2_000_000_000),
});

export const canteenTransactionSchema = z.object({
  menuId: z.string().min(1),
  studentId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1_000),
});

export type MenuInput = z.infer<typeof menuSchema>;
export type CanteenTransactionInput = z.infer<typeof canteenTransactionSchema>;
