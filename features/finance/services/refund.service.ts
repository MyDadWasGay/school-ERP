import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { feeInvoices, feePayments, feeRefunds, ledgerEntries } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { CurrentUser } from "@/lib/auth/types";
import type { RefundInput } from "../schemas/refund.schema";

export async function refundPayment(user: CurrentUser, input: RefundInput) {
  return getDb().transaction(async (tx) => {
    const payment = await tx.query.feePayments.findFirst({ where: and(
      eq(feePayments.id, input.paymentId),
      eq(feePayments.organizationId, user.organizationId),
      user.campusId ? eq(feePayments.campusId, user.campusId) : undefined,
      inArray(feePayments.status, ["posted", "partially_refunded"]),
    ) });
    if (!payment) throw new AppError("NOT_FOUND", "Posted payment not found in your scope.", 404);
    const invoice = await tx.query.feeInvoices.findFirst({ where: and(
      eq(feeInvoices.id, payment.invoiceId),
      eq(feeInvoices.organizationId, user.organizationId),
    ) });
    if (!invoice) throw new AppError("CONFLICT", "The payment invoice no longer exists.", 409);
    const previousRefunds = await tx.query.feeRefunds.findMany({ where: and(
      eq(feeRefunds.organizationId, user.organizationId),
      eq(feeRefunds.paymentId, payment.id),
      eq(feeRefunds.status, "completed"),
    ) });
    const refundedMinor = previousRefunds.reduce((total, refund) => total + refund.amountMinor, 0);
    const remainingMinor = payment.amountMinor - refundedMinor;
    if (input.amountMinor > remainingMinor) {
      throw new AppError("VALIDATION_ERROR", `Refund cannot exceed the remaining refundable amount of ${remainingMinor} minor units.`, 422);
    }
    const newBalance = invoice.balanceMinor + input.amountMinor;
    const [updatedInvoice] = await tx.update(feeInvoices).set({
      balanceMinor: newBalance,
      status: newBalance >= invoice.totalMinor ? "open" : "partial",
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(and(
      eq(feeInvoices.id, invoice.id),
      eq(feeInvoices.organizationId, user.organizationId),
      eq(feeInvoices.balanceMinor, invoice.balanceMinor),
    )).returning();
    if (!updatedInvoice) throw new AppError("CONFLICT", "The invoice changed while the refund was being posted. Refresh and try again.", 409);
    const fullyRefunded = refundedMinor + input.amountMinor === payment.amountMinor;
    const [refund] = await tx.insert(feeRefunds).values({
      organizationId: user.organizationId,
      campusId: payment.campusId,
      paymentId: payment.id,
      amountMinor: input.amountMinor,
      reason: input.reason,
      refundedAt: new Date(),
      refundedBy: user.id,
      createdBy: user.id,
      updatedBy: user.id,
      status: "completed",
    }).returning();
    await tx.update(feePayments).set({
      status: fullyRefunded ? "refunded" : "partially_refunded",
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(and(eq(feePayments.id, payment.id), eq(feePayments.organizationId, user.organizationId)));
    const cashAccount = payment.method === "cash" ? "cash" : "bank";
    await tx.insert(ledgerEntries).values([
      {
        organizationId: user.organizationId, campusId: payment.campusId,
        referenceType: "fee_refund", referenceId: refund.id, account: cashAccount,
        debitMinor: 0, creditMinor: input.amountMinor, postedAt: new Date(),
        createdBy: user.id, updatedBy: user.id,
      },
      {
        organizationId: user.organizationId, campusId: payment.campusId,
        referenceType: "fee_refund", referenceId: refund.id, account: "fee_receivable",
        debitMinor: input.amountMinor, creditMinor: 0, postedAt: new Date(),
        createdBy: user.id, updatedBy: user.id,
      },
    ]);
    return { refund, payment, invoice: updatedInvoice };
  });
}
