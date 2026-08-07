"use server";

import { revalidatePath } from "next/cache";
import { campusArchiveSchema, campusSchema, campusUpdateSchema, organizationSchema } from "../schemas/organization.schema";
import { archiveCampus, createCampus, updateCampus } from "../services/foundation.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { requirePlatformAdmin } from "@/lib/auth/platform";

export async function createOrganizationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Organization details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await requirePlatformAdmin();
    return { ok: false, error: "Use the platform school provisioning workflow so an administrator invite and audit record are created together.", code: "PLATFORM_WORKFLOW_REQUIRED" };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create organization." }; }
}

export async function createCampusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = campusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Campus details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("campuses:create");
    const row = await createCampus(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "campuses", entityType: "campus", entityId: row.id, after: row });
    revalidatePath("/campuses");
    return { ok: true, data: { id: row.id }, message: "Campus created." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create campus." }; }
}

export async function updateCampusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = campusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Campus details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("campuses:update");
    const result = await updateCampus(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "campuses", entityType: "campus", entityId: result.updated.id, before: result.before, after: result.updated });
    revalidatePath("/campuses");
    return { ok: true, data: { id: result.updated.id }, message: "Campus updated." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to update campus." }; }
}

export async function archiveCampusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = campusArchiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Campus is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("campuses:update");
    const row = await archiveCampus(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "campuses", entityType: "campus", entityId: row.id, after: { status: row.status } });
    revalidatePath("/campuses");
    return { ok: true, data: { id: row.id }, message: "Campus archived." };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to archive campus." }; }
}
