"use server";

import { revalidatePath } from "next/cache";
import { admissionApprovalSchema } from "../schemas/approval.schema";
import { approveAdmission } from "../services/approval.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";

export async function approveAdmissionAction(input: unknown): Promise<ActionResult<{ studentId: string }>> {
  const parsed = admissionApprovalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Admission approval data is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("admissions:approve");
    const result = await approveAdmission(user, parsed.data);
    await writeAuditLog(user, { action: "approve", module: "admissions", entityType: "application", entityId: result.application.id, before: result.application, after: { status: "approved", studentId: result.student.id } });
    revalidatePath("/admissions/approvals");
    revalidatePath("/students");
    return { ok: true, data: { studentId: result.student.id }, message: "Admission approved and student enrolled." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to approve admission." };
  }
}
