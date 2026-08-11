import { z } from "zod";

export const refundSchema = z.object({
  paymentId: z.string().min(1),
  idempotencyKey: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9_-]{10,120}$/,
      "Refund request keys may contain only letters, numbers, hyphens and underscores.",
    ),
  amountMinor: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
});

export type RefundInput = z.infer<typeof refundSchema>;
