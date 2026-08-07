import { z } from "zod";

export const invoiceSchema = z.object({
  studentId: z.string().min(1),
  dueOn: z.coerce.date(),
  description: z.string().trim().min(2).max(160),
  amountMinor: z.coerce.number().int().positive(),
}).refine(
  (input) => input.dueOn.getTime() >= new Date().setHours(0, 0, 0, 0),
  { message: "Due date cannot be in the past.", path: ["dueOn"] },
);

export type InvoiceInput = z.infer<typeof invoiceSchema>;
