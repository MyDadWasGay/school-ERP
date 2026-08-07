import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { feeInvoices, feePayments, feeReceipts, ledgerEntries } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { createId } from "@/lib/utils/ids";
import type { CurrentUser } from "@/lib/auth/types";
import type { PaymentInput } from "../schemas/payment.schema";
import { isPaymentAmountValid } from "./payment-rules";

export async function collectPayment(user: CurrentUser, input: PaymentInput) {
  const idempotencyKey = input.idempotencyKey?.trim() || createId("payment_request");
  return getDb().transaction(async (tx) => {
    const existing = await tx.query.feePayments.findFirst({ where: and(
      eq(feePayments.organizationId, user.organizationId),
      eq(feePayments.idempotencyKey, idempotencyKey),
    ) });
    if (existing) {
      const sameRequest = existing.invoiceId === input.invoiceId
        && existing.studentId === input.studentId
        && existing.amountMinor === input.amountMinor
        && existing.method === input.method;
      if (!sameRequest) throw new AppError("CONFLICT", "That payment request key was already used for different payment details.", 409);
      return existing;
    }
    const invoice = await tx.query.feeInvoices.findFirst({ where: and(
      eq(feeInvoices.id, input.invoiceId),
      eq(feeInvoices.organizationId, user.organizationId),
      eq(feeInvoices.studentId, input.studentId),
      user.campusId ? eq(feeInvoices.campusId, user.campusId) : undefined,
    ) });
    if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found.", 404);
    if (!["open", "partial", "overdue"].includes(invoice.status)) {
      throw new AppError("CONFLICT", "This invoice cannot accept payments.", 409);
    }
    if (!isPaymentAmountValid(input.amountMinor, invoice.balanceMinor)) {
      throw new AppError("VALIDATION_ERROR", "Payment must not exceed the outstanding balance.", 422);
    }
    const newBalance = invoice.balanceMinor - input.amountMinor;
    const updatedInvoice = await tx.update(feeInvoices).set({
      balanceMinor: newBalance,
      status: newBalance === 0 ? "paid" : "partial",
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(and(
      eq(feeInvoices.id, invoice.id),
      eq(feeInvoices.organizationId, user.organizationId),
      eq(feeInvoices.balanceMinor, invoice.balanceMinor),
    )).returning({ id: feeInvoices.id });
    if (updatedInvoice.length !== 1) {
      throw new AppError("CONFLICT", "The invoice balance changed while this payment was being posted. Refresh and try again.", 409);
    }
    const receiptNumber = `RCPT-${new Date().getFullYear()}-${createId("receipt").slice(-8).toUpperCase()}`;
    const [payment] = await tx.insert(feePayments).values({
      invoiceId: input.invoiceId,
      studentId: input.studentId,
      amountMinor: input.amountMinor,
      method: input.method,
      providerReference: input.providerReference,
      idempotencyKey,
      organizationId: user.organizationId,
      campusId: invoice.campusId,
      receiptNumber,
      paidAt: new Date(),
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();
    await tx.insert(feeReceipts).values({
      organizationId: user.organizationId,
      campusId: invoice.campusId,
      paymentId: payment.id,
      receiptNumber,
      issuedAt: new Date(),
      issuedBy: user.id,
      createdBy: user.id,
      updatedBy: user.id,
    });
    const cashAccount = input.method === "cash" ? "cash" : "bank";
    await tx.insert(ledgerEntries).values([
      {
        organizationId: user.organizationId, campusId: invoice.campusId,
        referenceType: "fee_payment", referenceId: payment.id, account: cashAccount,
        debitMinor: input.amountMinor, creditMinor: 0, postedAt: new Date(),
        createdBy: user.id, updatedBy: user.id,
      },
      {
        organizationId: user.organizationId, campusId: invoice.campusId,
        referenceType: "fee_payment", referenceId: payment.id, account: "fee_receivable",
        debitMinor: 0, creditMinor: input.amountMinor, postedAt: new Date(),
        createdBy: user.id, updatedBy: user.id,
      },
    ]);
    return payment;
  });
}
