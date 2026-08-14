import { z } from "zod";
import { parseIndiaDateValue } from "@/lib/utils/india-time";

const optionalText = (max: number) => z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(max).optional());

export const feeHeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
});

export const feeStructureSchema = z.object({
  academicYearId: z.string().min(1),
  classId: optionalText(120),
  name: z.string().trim().min(2).max(160),
  effectiveFrom: z.preprocess(parseIndiaDateValue, z.coerce.date()),
});

export const feeInstallmentSchema = z.object({
  feeStructureId: z.string().min(1),
  feeHeadId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  amountMinor: z.coerce.number().int().positive().max(2_000_000_000),
  dueOn: z.preprocess(parseIndiaDateValue, z.coerce.date()),
});

export type FeeHeadInput = z.infer<typeof feeHeadSchema>;
export type FeeStructureInput = z.infer<typeof feeStructureSchema>;
export type FeeInstallmentInput = z.infer<typeof feeInstallmentSchema>;
