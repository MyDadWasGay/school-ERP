"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import {
  assetAssignmentSchema,
  assetAssignmentStatusSchema,
  assetDepreciationSchema,
  assetMaintenanceSchema,
  assetMaintenanceStatusSchema,
  assetSchema,
  assetStatusSchema,
} from "../schemas/asset.schema";
import { assignAsset, createAsset, createAssetMaintenance, postAssetDepreciation, transitionAsset, transitionAssetAssignment, transitionAssetMaintenance } from "../services/asset.service";

function invalid(message: string): ActionResult<{ id: string }> { return { ok: false, error: message, code: "VALIDATION_ERROR" }; }

export async function createAssetAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assetSchema.safeParse(input); if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Asset details are invalid.");
  try { const user = await requirePermission("assets:create"); const row = await createAsset(user, parsed.data); await writeAuditLog(user, { action: "create", module: "assets", entityType: "asset", entityId: row.id, campusId: row.campusId, after: { name: row.name, code: row.code, status: row.status } }); revalidatePath("/assets/register"); revalidatePath("/assets/assignments"); revalidatePath("/assets/maintenance"); revalidatePath("/assets/depreciation"); return { ok: true, data: { id: row.id }, message: "Asset registered." }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to register asset." }; }
}

export async function transitionAssetAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assetStatusSchema.safeParse(input); if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Asset status is invalid.");
  try { const user = await requirePermission("assets:update"); const row = await transitionAsset(user, parsed.data); await writeAuditLog(user, { action: "update", module: "assets", entityType: "asset", entityId: row.id, campusId: row.campusId, after: { status: row.status } }); revalidatePath("/assets/register"); revalidatePath("/assets/assignments"); return { ok: true, data: { id: row.id }, message: `Asset moved to ${row.status}.` }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to update asset." }; }
}

export async function assignAssetAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assetAssignmentSchema.safeParse(input); if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Assignment details are invalid.");
  try { const user = await requirePermission("assets:update"); const row = await assignAsset(user, parsed.data); await writeAuditLog(user, { action: "create", module: "assets", entityType: "asset_assignment", entityId: row.id, campusId: row.campusId, after: { assetId: parsed.data.assetId, assigneeType: parsed.data.assigneeType, assigneeId: parsed.data.assigneeId, status: row.status } }); revalidatePath("/assets/assignments"); return { ok: true, data: { id: row.id }, message: "Asset assigned." }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to assign asset." }; }
}

export async function transitionAssetAssignmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assetAssignmentStatusSchema.safeParse(input); if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Assignment status is invalid.");
  try { const user = await requirePermission("assets:update"); const row = await transitionAssetAssignment(user, parsed.data); await writeAuditLog(user, { action: "update", module: "assets", entityType: "asset_assignment", entityId: row.id, campusId: row.campusId, after: { status: row.status } }); revalidatePath("/assets/assignments"); return { ok: true, data: { id: row.id }, message: `Assignment moved to ${row.status}.` }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to update assignment." }; }
}

export async function createAssetMaintenanceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assetMaintenanceSchema.safeParse(input); if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Maintenance details are invalid.");
  try { const user = await requirePermission("assets:update"); const row = await createAssetMaintenance(user, parsed.data); await writeAuditLog(user, { action: "create", module: "assets", entityType: "asset_maintenance_ticket", entityId: row.id, campusId: row.campusId, after: { assetId: parsed.data.assetId, status: row.status } }); revalidatePath("/assets/maintenance"); return { ok: true, data: { id: row.id }, message: "Maintenance ticket created." }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create maintenance ticket." }; }
}

export async function transitionAssetMaintenanceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assetMaintenanceStatusSchema.safeParse(input); if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Maintenance status is invalid.");
  try { const user = await requirePermission("assets:update"); const row = await transitionAssetMaintenance(user, parsed.data); await writeAuditLog(user, { action: "update", module: "assets", entityType: "asset_maintenance_ticket", entityId: row.id, campusId: row.campusId, after: { status: row.status } }); revalidatePath("/assets/maintenance"); return { ok: true, data: { id: row.id }, message: `Maintenance ticket moved to ${row.status}.` }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to update maintenance ticket." }; }
}

export async function postAssetDepreciationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assetDepreciationSchema.safeParse(input); if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Depreciation details are invalid.");
  try { const user = await requirePermission("assets:update"); const result = await postAssetDepreciation(user, parsed.data); await writeAuditLog(user, { action: "create", module: "assets", entityType: "asset_depreciation", entityId: result.entry.id, campusId: result.entry.campusId, after: { assetId: parsed.data.assetId, period: parsed.data.period, amountMinor: parsed.data.amountMinor } }); revalidatePath("/assets/depreciation"); revalidatePath("/assets/register"); return { ok: true, data: { id: result.entry.id }, message: "Depreciation posted." }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to post depreciation." }; }
}
