import { z } from "zod";
import { parseIndiaDateValue } from "@/lib/utils/india-time";

export const accountSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/),
  name: z.string().trim().min(2).max(160),
  accountType: z.enum(["asset", "liability", "income", "expense", "equity"]),
  parentId: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().max(120).optional()),
});

export const expenseSchema = z.object({
  accountId: z.string().min(1),
  description: z.string().trim().min(2).max(240),
  amountMinor: z.coerce.number().int().positive().max(2_000_000_000),
  incurredOn: z.preprocess(parseIndiaDateValue, z.coerce.date()),
});

export type AccountInput = z.infer<typeof accountSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const donationSchema = z.object({
  donorName: z.string().trim().min(2).max(160),
  donorEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  amountMinor: z.coerce.number().int().positive().max(2_000_000_000),
  purpose: z.string().trim().min(2).max(240),
  paymentReference: z.string().trim().max(160).optional().or(z.literal("")),
  receivedAt: z.preprocess(parseIndiaDateValue, z.coerce.date()),
});

export type DonationInput = z.infer<typeof donationSchema>;
