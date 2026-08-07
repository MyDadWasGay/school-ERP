"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { requirePermission } from "@/lib/auth/guards";
import type { ActionResult } from "@/lib/errors/result";
import {
  delegationCreateSchema,
  delegationRevokeSchema,
  userAccessUpdateSchema,
} from "../schemas/user-access.schema";
import {
  createDelegation,
  revokeDelegation,
  updateUserAccess,
} from "../services/access.service";

export async function updateUserAccessAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = userAccessUpdateSchema.safeParse(input);
  if (!parsed.success) return {
    ok: false,
    error: parsed.error.issues[0]?.message ?? "User access details are invalid.",
    code: "VALIDATION_ERROR",
    fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
  };
  try {
    const actor = await requirePermission("users:update");
    const result = await updateUserAccess(actor, parsed.data);
    await writeAuditLog(actor, {
      action: "update",
      module: "users",
      entityType: "user_access",
      entityId: parsed.data.id,
      campusId: parsed.data.primaryCampusId,
      before: result.before,
      after: result.updated,
    });
    revalidatePath(`/users/${parsed.data.id}`);
    revalidatePath("/users");
    return { ok: true, data: { id: parsed.data.id }, message: "Role, status and access scopes updated." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update user access." };
  }
}

export async function createDelegationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = delegationCreateSchema.safeParse(input);
  if (!parsed.success) return {
    ok: false,
    error: parsed.error.issues[0]?.message ?? "Delegated access details are invalid.",
    code: "VALIDATION_ERROR",
  };
  try {
    const actor = await requirePermission("users:update");
    const row = await createDelegation(actor, parsed.data);
    await writeAuditLog(actor, {
      action: "create",
      module: "users",
      entityType: "delegated_access",
      entityId: row.id,
      campusId: row.campusId ?? undefined,
      after: row,
    });
    revalidatePath(`/users/${parsed.data.userId}`);
    return { ok: true, data: { id: row.id }, message: "Temporary delegated access granted." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to grant delegated access." };
  }
}

export async function revokeDelegationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = delegationRevokeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Delegation selection is invalid.", code: "VALIDATION_ERROR" };
  try {
    const actor = await requirePermission("users:update");
    const result = await revokeDelegation(actor, parsed.data);
    await writeAuditLog(actor, {
      action: "update",
      module: "users",
      entityType: "delegated_access",
      entityId: parsed.data.id,
      before: result.before,
      after: result.updated,
    });
    revalidatePath(`/users/${parsed.data.userId}`);
    return { ok: true, data: { id: parsed.data.id }, message: "Delegated access revoked." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to revoke delegated access." };
  }
}
