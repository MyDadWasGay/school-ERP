"use server";
import { revalidatePath } from "next/cache";
import { paymentSchema } from "../schemas/payment.schema";
import { collectPayment } from "../services/payment.service";
import { refundPayment } from "../services/refund.service";
import { refundSchema } from "../schemas/refund.schema";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
export async function collectPaymentAction(input: unknown): Promise<ActionResult<{ id: string }>> { const parsed = paymentSchema.safeParse(input); if (!parsed.success) return { ok: false, error: "Payment data is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors }; try { const user = await requirePermission("fees:collect"); const payment = await collectPayment(user, parsed.data); await writeAuditLog(user, { action: "collect_payment", module: "finance", entityType: "fee_payment", entityId: payment.id, campusId: payment.campusId, after: payment }); revalidatePath("/fees/payments"); return { ok: true, data: { id: payment.id }, message: "Payment collected and ledger posted." }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to collect payment." }; } }

export async function refundPaymentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = refundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Refund data is invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("fees:refund");
    const result = await refundPayment(user, parsed.data);
    await writeAuditLog(user, { action: "refund_payment", module: "finance", entityType: "fee_refund", entityId: result.refund.id, campusId: result.refund.campusId, after: result.refund });
    revalidatePath("/fees/payments");
    revalidatePath("/fees/invoices");
    return { ok: true, data: { id: result.refund.id }, message: "Refund posted and ledger reversal recorded." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to refund payment." };
  }
}
