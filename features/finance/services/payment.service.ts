import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  feeInvoices,
  feePayments,
  feeReceipts,
  ledgerEntries,
} from "@/db/schema";
import { getReadableStudent } from "@/features/students/services/students.service";
import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/app-error";
import { createId } from "@/lib/utils/ids";
import type { PaymentInput } from "../schemas/payment.schema";
import { isPaymentAmountValid } from "./payment-rules";

type PaymentActor = {
  organizationId: string;
  campusId?: string | null;
  userId: string;
};

function samePaymentRequest(
  existing: typeof feePayments.$inferSelect,
  input: PaymentInput,
) {
  return (
    existing.invoiceId === input.invoiceId &&
    existing.studentId === input.studentId &&
    existing.amountMinor === input.amountMinor &&
    existing.method === input.method &&
    (existing.providerReference ?? null) === (input.providerReference ?? null)
  );
}

export async function collectPayment(user: CurrentUser, input: PaymentInput) {
  if (input.method === "online")
    throw new AppError(
      "VALIDATION_ERROR",
      "Online payments must be created and verified through the Razorpay checkout workflow.",
      422,
    );
  await getReadableStudent(user, input.studentId);
  return postAuthorizedPayment(
    {
      organizationId: user.organizationId,
      campusId: user.campusId,
      userId: user.id,
    },
    input,
  );
}

export async function postAuthorizedPayment(
  actor: PaymentActor,
  input: PaymentInput,
) {
  const idempotencyKey =
    input.idempotencyKey?.trim() || createId("payment_request");
  const loadExisting = async () => {
    const existing = await getDb().query.feePayments.findFirst({
      where: and(
        eq(feePayments.organizationId, actor.organizationId),
        eq(feePayments.idempotencyKey, idempotencyKey),
      ),
    });
    if (!existing) return undefined;
    if (!samePaymentRequest(existing, input))
      throw new AppError(
        "CONFLICT",
        "That payment request key was already used for different payment details.",
        409,
      );
    return existing;
  };

  const existingBeforeTransaction = await loadExisting();
  if (existingBeforeTransaction) return existingBeforeTransaction;

  try {
    return await getDb().transaction(async (tx) => {
      const existing = await tx.query.feePayments.findFirst({
        where: and(
          eq(feePayments.organizationId, actor.organizationId),
          eq(feePayments.idempotencyKey, idempotencyKey),
        ),
      });
      if (existing) {
        if (!samePaymentRequest(existing, input))
          throw new AppError(
            "CONFLICT",
            "That payment request key was already used for different payment details.",
            409,
          );
        return existing;
      }
      const invoice = await tx.query.feeInvoices.findFirst({
        where: and(
          eq(feeInvoices.id, input.invoiceId),
          eq(feeInvoices.organizationId, actor.organizationId),
          eq(feeInvoices.studentId, input.studentId),
          actor.campusId ? eq(feeInvoices.campusId, actor.campusId) : undefined,
        ),
      });
      if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found.", 404);
      if (!["open", "partial", "overdue"].includes(invoice.status))
        throw new AppError(
          "CONFLICT",
          "This invoice cannot accept payments.",
          409,
        );
      if (!isPaymentAmountValid(input.amountMinor, invoice.balanceMinor))
        throw new AppError(
          "VALIDATION_ERROR",
          "Payment must not exceed the outstanding balance.",
          422,
        );

      const newBalance = invoice.balanceMinor - input.amountMinor;
      const updatedInvoice = await tx
        .update(feeInvoices)
        .set({
          balanceMinor: newBalance,
          status: newBalance === 0 ? "paid" : "partial",
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(feeInvoices.id, invoice.id),
            eq(feeInvoices.organizationId, actor.organizationId),
            eq(feeInvoices.balanceMinor, invoice.balanceMinor),
          ),
        )
        .returning({ id: feeInvoices.id });
      if (updatedInvoice.length !== 1)
        throw new AppError(
          "CONFLICT",
          "The invoice balance changed while this payment was being posted. Refresh and try again.",
          409,
        );

      const receiptNumber = `RCPT-${new Date().getFullYear()}-${createId("receipt").slice(-8).toUpperCase()}`;
      const [payment] = await tx
        .insert(feePayments)
        .values({
          invoiceId: input.invoiceId,
          studentId: input.studentId,
          amountMinor: input.amountMinor,
          method: input.method,
          providerReference: input.providerReference,
          idempotencyKey,
          organizationId: actor.organizationId,
          campusId: invoice.campusId,
          receiptNumber,
          paidAt: new Date(),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      if (!payment)
        throw new AppError(
          "DATABASE_ERROR",
          "Unable to post the payment.",
          500,
        );
      await tx.insert(feeReceipts).values({
        organizationId: actor.organizationId,
        campusId: invoice.campusId,
        paymentId: payment.id,
        receiptNumber,
        issuedAt: new Date(),
        issuedBy: actor.userId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
      const cashAccount = input.method === "cash" ? "cash" : "bank";
      await tx.insert(ledgerEntries).values([
        {
          organizationId: actor.organizationId,
          campusId: invoice.campusId,
          referenceType: "fee_payment",
          referenceId: payment.id,
          account: cashAccount,
          debitMinor: input.amountMinor,
          creditMinor: 0,
          postedAt: new Date(),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        {
          organizationId: actor.organizationId,
          campusId: invoice.campusId,
          referenceType: "fee_payment",
          referenceId: payment.id,
          account: "fee_receivable",
          debitMinor: 0,
          creditMinor: input.amountMinor,
          postedAt: new Date(),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      ]);
      return payment;
    });
  } catch (error) {
    const existingAfterConflict = await loadExisting();
    if (existingAfterConflict) return existingAfterConflict;
    throw error;
  }
}
