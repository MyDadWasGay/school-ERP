"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { integrationConfigSchema, integrationStatusSchema } from "../schemas/integration.schema";
import { saveIntegrationConfig, setIntegrationStatus } from "../services/integration.service";

export async function saveIntegrationConfigAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = integrationConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Integration settings are invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("integrations:manage");
    const row = await saveIntegrationConfig(user, parsed.data);
    await writeAuditLog(user, { action: "update", module: "integrations", entityType: "integration_config", entityId: row.id, campusId: row.campusId, after: { provider: row.provider, status: row.status } });
    revalidatePath("/integrations");
    return { ok: true, data: { id: row.id }, message: `${row.provider} configuration saved securely.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save integration settings." };
  }
}

export async function setIntegrationStatusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = integrationStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Integration status is invalid.", code: "VALIDATION_ERROR" };
  try {
    const user = await requirePermission("integrations:manage");
    const row = await setIntegrationStatus(user, parsed.data.id, parsed.data.status);
    await writeAuditLog(user, { action: "update", module: "integrations", entityType: "integration_config", entityId: row.id, campusId: user.campusId, after: row });
    revalidatePath("/integrations");
    return { ok: true, data: { id: row.id }, message: `${row.provider} integration ${parsed.data.status}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update integration status." };
  }
}
