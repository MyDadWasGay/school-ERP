import { z } from "zod";

export const refundSchema = z.object({
  paymentId: z.string().min(1),
  amountMinor: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
});

export type RefundInput = z.infer<typeof refundSchema>;
