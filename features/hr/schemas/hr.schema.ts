import { z } from "zod";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

export const employeeSchema = z.object({
  employeeNumber: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Employee ID contains unsupported characters."),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: optionalText(254).refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email address."),
  jobTitle: optionalText(120),
  linkedUserId: optionalText(80),
  salaryMinor: z.coerce.number().int().min(0).max(2_000_000_000),
  allowanceMinor: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
  fixedDeductionMinor: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
  deductionRateBps: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const payrollRunSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a payroll period such as 2026-08."),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type PayrollRunInput = z.infer<typeof payrollRunSchema>;
