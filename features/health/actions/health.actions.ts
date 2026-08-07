"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { clinicVisitSchema, healthProfileSchema } from "../schemas/health.schema";
import { createClinicVisit, upsertHealthProfile } from "../services/health.service";

export async function upsertHealthProfileAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = healthProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Health profile details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("health:update"); const row = await upsertHealthProfile(user, parsed.data); await writeAuditLog(user, { action: "update", module: "health", entityType: "health_profile", entityId: row.id, campusId: row.campusId, metadata: { studentId: row.studentId } }); revalidatePath("/health/profiles"); return { ok: true, data: { id: row.id }, message: "Health profile saved." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to save health profile." }; }
}

export async function createClinicVisitAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = clinicVisitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Clinic visit details are invalid.", code: "VALIDATION_ERROR" };
  try { const user = await requirePermission("health:update"); const row = await createClinicVisit(user, parsed.data); await writeAuditLog(user, { action: "create", module: "health", entityType: "clinic_visit", entityId: row.id, campusId: row.campusId, metadata: { studentId: row.studentId } }); revalidatePath("/health/clinic-visits"); return { ok: true, data: { id: row.id }, message: "Clinic visit recorded." }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to record clinic visit." }; }
}
