import { z } from "zod";
import { indiaDateKey, indiaTodayKey, parseIndiaDateValue } from "@/lib/utils/india-time";

export const invoiceSchema = z.object({
  studentId: z.string().min(1),
  dueOn: z.preprocess(parseIndiaDateValue, z.coerce.date()),
  description: z.string().trim().min(2).max(160),
  amountMinor: z.coerce.number().int().positive(),
}).refine(
  (input) => indiaDateKey(input.dueOn) >= indiaTodayKey(),
  { message: "Due date cannot be in the past.", path: ["dueOn"] },
);

export type InvoiceInput = z.infer<typeof invoiceSchema>;
