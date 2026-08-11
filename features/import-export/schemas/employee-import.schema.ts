import { z } from "zod";

export const employeeImportRowSchema = z.object({
  employeeNumber: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().email().max(254).optional()),
  jobTitle: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().max(120).optional()),
  salaryMinor: z.coerce.number().int().min(0).max(2_000_000_000),
  allowanceMinor: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
  fixedDeductionMinor: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
  deductionRateBps: z.coerce.number().int().min(0).max(10_000).default(0),
});

export type EmployeeImportRow = z.infer<typeof employeeImportRowSchema>;
