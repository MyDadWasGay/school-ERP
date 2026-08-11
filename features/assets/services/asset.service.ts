
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assetAssignments, assetDepreciationEntries, assetMaintenanceTickets, assets, employees, students } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import { createId } from "@/lib/utils/ids";
import type {
  AssetAssignmentInput,
  AssetAssignmentStatusInput,
  AssetDepreciationInput,
  AssetInput,
  AssetMaintenanceInput,
  AssetMaintenanceStatusInput,
  AssetStatusInput,
} from "../schemas/asset.schema";

type AssetDetails = {
  category: string;
  serialNumber: string | null;
  acquisitionMinor: number;
  bookValueMinor: number;
  usefulLifeMonths: number;
};

function parseDetails(value: string | null): AssetDetails {
  if (!value) throw new AppError("DATABASE_ERROR", "Asset details are unavailable.", 500);
  try {
    const parsed = JSON.parse(value) as Partial<AssetDetails>;
    if (typeof parsed.acquisitionMinor !== "number" || typeof parsed.bookValueMinor !== "number" || typeof parsed.usefulLifeMonths !== "number" || typeof parsed.category !== "string") throw new Error("invalid details");
    return {
      category: parsed.category,
      serialNumber: typeof parsed.serialNumber === "string" ? parsed.serialNumber : null,
      acquisitionMinor: parsed.acquisitionMinor,
      bookValueMinor: parsed.bookValueMinor,
      usefulLifeMonths: parsed.usefulLifeMonths,
    };
  } catch {
    throw new AppError("DATABASE_ERROR", "Asset details are invalid.", 500);
  }
}

async function getAsset(user: CurrentUser, id: string) {
  const row = await getDb().query.assets.findFirst({ where: and(
    eq(assets.id, id),
    eq(assets.organizationId, user.organizationId),
    user.campusId ? eq(assets.campusId, user.campusId) : undefined,
  ) });
  if (!row) throw new AppError("NOT_FOUND", "Asset not found in your scope.", 404);
  return row;
}

const assetTransitions: Record<string, string[]> = {
  active: ["retired", "disposed"],
  retired: ["active", "disposed"],
};

const assignmentTransitions: Record<string, string[]> = { active: ["returned", "cancelled"] };
const maintenanceTransitions: Record<string, string[]> = { open: ["in_progress", "cancelled"], in_progress: ["completed", "cancelled"] };

export async function listAssets(user: CurrentUser) {
  return getDb().select().from(assets).where(and(
    eq(assets.organizationId, user.organizationId),
    user.campusId ? eq(assets.campusId, user.campusId) : undefined,
    eq(assets.status, "active"),
  )).orderBy(desc(assets.createdAt)).limit(500);
}

export async function listAllAssets(user: CurrentUser) {
  return getDb().select().from(assets).where(and(
    eq(assets.organizationId, user.organizationId),
    user.campusId ? eq(assets.campusId, user.campusId) : undefined,
  )).orderBy(desc(assets.createdAt)).limit(500);
}

export async function createAsset(user: CurrentUser, input: AssetInput) {
  const [row] = await getDb().insert(assets).values({
    id: createId("asset"), organizationId: user.organizationId, campusId: user.campusId,
    name: input.name, code: input.code,
    detailsJson: JSON.stringify({ category: input.category, serialNumber: input.serialNumber || null, acquisitionMinor: input.acquisitionMinor, bookValueMinor: input.acquisitionMinor, usefulLifeMonths: input.usefulLifeMonths }),
    status: "active", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create asset.", 500);
  return row;
}

export async function transitionAsset(user: CurrentUser, input: AssetStatusInput) {
  const row = await getAsset(user, input.id);
  if (!assetTransitions[row.status]?.includes(input.toStatus)) throw new AppError("CONFLICT", `Cannot move asset from ${row.status} to ${input.toStatus}.`, 409);
  const [updated] = await getDb().update(assets).set({ status: input.toStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(assets.id, row.id), eq(assets.status, row.status))).returning();
  if (!updated) throw new AppError("CONFLICT", "Asset changed before the status update was saved.", 409);
  return updated;
}

export async function listAssetAssignments(user: CurrentUser) {
  return getDb().select({
    id: assetAssignments.id,
    assetId: assetAssignments.referenceId,
    assetName: assets.name,
    assetCode: assets.code,
    assigneeType: assetAssignments.assigneeType,
    assigneeId: assetAssignments.assigneeId,
    detailsJson: assetAssignments.detailsJson,
    effectiveAt: assetAssignments.effectiveAt,
    status: assetAssignments.status,
  }).from(assetAssignments).innerJoin(assets, and(
    eq(assets.id, assetAssignments.referenceId),
    eq(assets.organizationId, user.organizationId),
  )).where(and(
    eq(assetAssignments.organizationId, user.organizationId),
    user.campusId ? eq(assetAssignments.campusId, user.campusId) : undefined,
  )).orderBy(desc(assetAssignments.effectiveAt)).limit(500);
}

export async function assignAsset(user: CurrentUser, input: AssetAssignmentInput) {
  const asset = await getAsset(user, input.assetId);
  if (asset.status !== "active") throw new AppError("CONFLICT", "Only active assets can be assigned.", 409);
  const assignee = input.assigneeType === "student"
    ? await getDb().query.students.findFirst({ where: and(eq(students.id, input.assigneeId), eq(students.organizationId, user.organizationId), user.campusId ? eq(students.campusId, user.campusId) : undefined, eq(students.status, "active")) })
    : await getDb().query.employees.findFirst({ where: and(eq(employees.id, input.assigneeId), eq(employees.organizationId, user.organizationId), user.campusId ? eq(employees.campusId, user.campusId) : undefined, eq(employees.status, "active")) });
  if (!assignee) throw new AppError("NOT_FOUND", "Assignee not found in your scope.", 404);
  const activeAssignment = await getDb().query.assetAssignments.findFirst({ where: and(eq(assetAssignments.referenceId, asset.id), eq(assetAssignments.organizationId, user.organizationId), eq(assetAssignments.status, "active")) });
  if (activeAssignment) throw new AppError("CONFLICT", "This asset is already assigned.", 409);
  const assigneeName = input.assigneeType === "student" ? `${assignee.firstName} ${assignee.lastName}` : `${assignee.firstName} ${assignee.lastName}`;
  const [row] = await getDb().insert(assetAssignments).values({
    id: createId("asset_assignment"), organizationId: user.organizationId, campusId: asset.campusId,
    name: `Assignment of ${asset.name}`, referenceId: asset.id, effectiveAt: new Date(),
    assigneeType: input.assigneeType, assigneeId: input.assigneeId,
    detailsJson: JSON.stringify({ assigneeName, notes: input.notes || null }), status: "active", createdBy: user.id, updatedBy: user.id,
  }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to assign asset.", 500);
  return row;
}

export async function transitionAssetAssignment(user: CurrentUser, input: AssetAssignmentStatusInput) {
  const row = await getDb().query.assetAssignments.findFirst({ where: and(eq(assetAssignments.id, input.id), eq(assetAssignments.organizationId, user.organizationId), user.campusId ? eq(assetAssignments.campusId, user.campusId) : undefined) });
  if (!row) throw new AppError("NOT_FOUND", "Asset assignment not found.", 404);
  if (!assignmentTransitions[row.status]?.includes(input.toStatus)) throw new AppError("CONFLICT", `Cannot move assignment from ${row.status} to ${input.toStatus}.`, 409);
  const [updated] = await getDb().update(assetAssignments).set({ status: input.toStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(assetAssignments.id, row.id), eq(assetAssignments.status, row.status))).returning();
  if (!updated) throw new AppError("CONFLICT", "Assignment changed before the update was saved.", 409);
  return updated;
}

export async function listAssetMaintenance(user: CurrentUser) {
  return getDb().select({ id: assetMaintenanceTickets.id, assetId: assetMaintenanceTickets.referenceId, assetName: assets.name, title: assetMaintenanceTickets.name, detailsJson: assetMaintenanceTickets.detailsJson, status: assetMaintenanceTickets.status, createdAt: assetMaintenanceTickets.createdAt }).from(assetMaintenanceTickets).innerJoin(assets, and(eq(assets.id, assetMaintenanceTickets.referenceId), eq(assets.organizationId, user.organizationId))).where(and(eq(assetMaintenanceTickets.organizationId, user.organizationId), user.campusId ? eq(assetMaintenanceTickets.campusId, user.campusId) : undefined)).orderBy(desc(assetMaintenanceTickets.createdAt)).limit(500);
}

export async function createAssetMaintenance(user: CurrentUser, input: AssetMaintenanceInput) {
  const asset = await getAsset(user, input.assetId);
  if (asset.status === "disposed") throw new AppError("CONFLICT", "Disposed assets cannot receive maintenance tickets.", 409);
  const [row] = await getDb().insert(assetMaintenanceTickets).values({ id: createId("asset_ticket"), organizationId: user.organizationId, campusId: asset.campusId, name: input.title, referenceId: asset.id, detailsJson: JSON.stringify({ costMinor: input.costMinor, notes: input.notes || null }), status: "open", createdBy: user.id, updatedBy: user.id }).returning();
  if (!row) throw new AppError("DATABASE_ERROR", "Unable to create maintenance ticket.", 500);
  return row;
}

export async function transitionAssetMaintenance(user: CurrentUser, input: AssetMaintenanceStatusInput) {
  const row = await getDb().query.assetMaintenanceTickets.findFirst({ where: and(eq(assetMaintenanceTickets.id, input.id), eq(assetMaintenanceTickets.organizationId, user.organizationId), user.campusId ? eq(assetMaintenanceTickets.campusId, user.campusId) : undefined) });
  if (!row) throw new AppError("NOT_FOUND", "Maintenance ticket not found.", 404);
  if (!maintenanceTransitions[row.status]?.includes(input.toStatus)) throw new AppError("CONFLICT", `Cannot move maintenance ticket from ${row.status} to ${input.toStatus}.`, 409);
  const [updated] = await getDb().update(assetMaintenanceTickets).set({ status: input.toStatus, updatedAt: new Date(), updatedBy: user.id }).where(and(eq(assetMaintenanceTickets.id, row.id), eq(assetMaintenanceTickets.status, row.status))).returning();
  if (!updated) throw new AppError("CONFLICT", "Maintenance ticket changed before the update was saved.", 409);
  return updated;
}

export async function listAssetDepreciation(user: CurrentUser) {
  return getDb().select({ id: assetDepreciationEntries.id, assetId: assetDepreciationEntries.referenceId, assetName: assets.name, period: assetDepreciationEntries.code, detailsJson: assetDepreciationEntries.detailsJson, effectiveAt: assetDepreciationEntries.effectiveAt, status: assetDepreciationEntries.status }).from(assetDepreciationEntries).innerJoin(assets, and(eq(assets.id, assetDepreciationEntries.referenceId), eq(assets.organizationId, user.organizationId))).where(and(eq(assetDepreciationEntries.organizationId, user.organizationId), user.campusId ? eq(assetDepreciationEntries.campusId, user.campusId) : undefined)).orderBy(desc(assetDepreciationEntries.effectiveAt)).limit(500);
}

export async function postAssetDepreciation(user: CurrentUser, input: AssetDepreciationInput) {
  const asset = await getAsset(user, input.assetId);
  if (asset.status === "disposed") throw new AppError("CONFLICT", "Disposed assets cannot be depreciated.", 409);
  const details = parseDetails(asset.detailsJson);
  if (input.amountMinor > details.bookValueMinor) throw new AppError("CONFLICT", "Depreciation cannot exceed the current book value.", 409);
  return getDb().transaction(async (tx) => {
    const existing = await tx.query.assetDepreciationEntries.findFirst({ where: and(eq(assetDepreciationEntries.organizationId, user.organizationId), eq(assetDepreciationEntries.referenceId, asset.id), eq(assetDepreciationEntries.code, input.period)) });
    if (existing) throw new AppError("CONFLICT", "Depreciation for this asset and period is already posted.", 409);
    const afterMinor = details.bookValueMinor - input.amountMinor;
    const [entry] = await tx.insert(assetDepreciationEntries).values({ id: createId("depreciation"), organizationId: user.organizationId, campusId: asset.campusId, name: `Depreciation ${input.period} · ${asset.name}`, code: input.period, referenceId: asset.id, effectiveAt: new Date(`${input.period}-01T00:00:00.000Z`), detailsJson: JSON.stringify({ amountMinor: input.amountMinor, bookValueBeforeMinor: details.bookValueMinor, bookValueAfterMinor: afterMinor }), status: "posted", createdBy: user.id, updatedBy: user.id }).returning();
    if (!entry) throw new AppError("DATABASE_ERROR", "Unable to record depreciation.", 500);
    const detailsMatch = asset.detailsJson === null ? isNull(assets.detailsJson) : eq(assets.detailsJson, asset.detailsJson);
    const [updatedAsset] = await tx.update(assets).set({ detailsJson: JSON.stringify({ ...details, bookValueMinor: afterMinor }), updatedAt: new Date(), updatedBy: user.id }).where(and(eq(assets.id, asset.id), eq(assets.organizationId, user.organizationId), detailsMatch)).returning();
    if (!updatedAsset) throw new AppError("CONFLICT", "Asset changed before depreciation was posted.", 409);
    return { entry, asset: updatedAsset };
  });
}
