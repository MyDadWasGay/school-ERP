"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import type { ActionResult } from "@/lib/errors/result";
import { invoiceSchema } from "../schemas/invoice.schema";
import { createInvoice } from "../services/finance-workspace.service";

export async function createInvoiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invoice details are invalid.", code: "VALIDATION_ERROR", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const user = await requirePermission("fees:create");
    const row = await createInvoice(user, parsed.data);
    await writeAuditLog(user, { action: "create", module: "fees", entityType: "fee_invoice", entityId: row.id, after: row });
    revalidatePath("/fees/invoices");
    revalidatePath("/fees/payments");
    return { ok: true, data: { id: row.id }, message: `Invoice ${row.invoiceNumber} created.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create invoice." };
  }
}
