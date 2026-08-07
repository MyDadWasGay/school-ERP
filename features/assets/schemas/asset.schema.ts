import { z } from "zod";

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Period must use YYYY-MM format.");

export const assetSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(80),
  serialNumber: z.string().trim().max(120).optional(),
  acquisitionMinor: z.coerce.number().int().min(0).max(2_000_000_000),
  usefulLifeMonths: z.coerce.number().int().min(1).max(1_200),
});

export const assetStatusSchema = z.object({
  id: z.string().min(1),
  toStatus: z.enum(["active", "retired", "disposed"]),
});

export const assetAssignmentSchema = z.object({
  assetId: z.string().min(1),
  assigneeType: z.enum(["student", "employee"]),
  assigneeId: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
});

export const assetAssignmentStatusSchema = z.object({
  id: z.string().min(1),
  toStatus: z.enum(["returned", "cancelled"]),
});

export const assetMaintenanceSchema = z.object({
  assetId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  costMinor: z.coerce.number().int().min(0).max(2_000_000_000),
  notes: z.string().trim().max(500).optional(),
});

export const assetMaintenanceStatusSchema = z.object({
  id: z.string().min(1),
  toStatus: z.enum(["in_progress", "completed", "cancelled"]),
});

export const assetDepreciationSchema = z.object({
  assetId: z.string().min(1),
  period: periodSchema,
  amountMinor: z.coerce.number().int().min(1).max(2_000_000_000),
});

export type AssetInput = z.infer<typeof assetSchema>;
export type AssetStatusInput = z.infer<typeof assetStatusSchema>;
export type AssetAssignmentInput = z.infer<typeof assetAssignmentSchema>;
export type AssetAssignmentStatusInput = z.infer<typeof assetAssignmentStatusSchema>;
export type AssetMaintenanceInput = z.infer<typeof assetMaintenanceSchema>;
export type AssetMaintenanceStatusInput = z.infer<typeof assetMaintenanceStatusSchema>;
export type AssetDepreciationInput = z.infer<typeof assetDepreciationSchema>;
