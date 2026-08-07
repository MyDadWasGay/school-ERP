import { z } from "zod";
export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  studentId: z.string().min(1),
  amountMinor: z.coerce.number().int().positive(),
  method: z.enum(["cash", "cheque", "card", "upi", "bank_transfer", "online"]),
  idempotencyKey: z.string().trim().min(8).max(120).optional().or(z.literal("")),
  providerReference: z.string().trim().max(120).optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;
