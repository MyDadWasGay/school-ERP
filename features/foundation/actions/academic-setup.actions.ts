"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { academicSetupArchiveSchema, academicSetupSchema, academicSetupUpdateSchema } from "../schemas/academic-setup.schema";
import { archiveAcademicSetup, createAcademicSetup, updateAcademicSetup } from "../services/academic-setup.service";

const routeForKind = {
  academic_year: "/settings/academic-years",
  class: "/settings/classes",
  section: "/settings/sections",
  subject: "/settings/subjects",
} as const;

export async function createAcademicSetupAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = academicSetupSchema.safeParse(input);
  if (!parsed.success) return {
    ok: false,
    error: parsed.error.issues[0]?.message ?? "Setup details are invalid.",
    code: "VALIDATION_ERROR",
    fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
  };
  try {
    const user = await requirePermission("settings:update");
    const row = await createAcademicSetup(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "settings", entityType: parsed.data.kind, entityId: row.id, after: row });
    revalidatePath(routeForKind[parsed.data.kind]);
    return { ok: true, data: { id: row.id }, message: `${parsed.data.kind.replaceAll("_", " ")} created.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create setup record." };
  }
}

export async function updateAcademicSetupAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = academicSetupUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Setup details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    const user = await requirePermission("settings:update");
    const row = await updateAcademicSetup(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "settings", entityType: parsed.data.kind, entityId: row.id, after: row });
    revalidatePath(routeForKind[parsed.data.kind]);
    return { ok: true, data: { id: row.id }, message: `${parsed.data.kind.replaceAll("_", " ")} updated.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update setup record." };
  }
}

export async function archiveAcademicSetupAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = academicSetupArchiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Setup record is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    const user = await requirePermission("settings:update");
    const row = await archiveAcademicSetup(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "settings", entityType: parsed.data.kind, entityId: row.id, after: { status: row.status } });
    revalidatePath(routeForKind[parsed.data.kind]);
    return { ok: true, data: { id: row.id }, message: `${parsed.data.kind.replaceAll("_", " ")} archived.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to archive setup record." };
  }
}
