import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  feeInvoices,
  feePayments,
  feeRefunds,
  ledgerEntries,
} from "@/db/schema";
import { loadRazorpayConfiguration } from "@/features/integrations/services/razorpay-config.service";
import { AppError } from "@/lib/errors/app-error";
import {
  RazorpayClient,
  RazorpayProviderError,
  type RazorpayRefund,
} from "@/lib/integrations/razorpay";
import type { CurrentUser } from "@/lib/auth/types";
import type { RefundInput } from "../schemas/refund.schema";

type RefundActor = {
  organizationId: string;
  campusId?: string | null;
  userId: string;
};

const reservedRefundStatuses = [
  "creating",
  "pending",
  "processing",
  "manual_review",
  "completed",
];

function sameRefundRequest(
  refund: typeof feeRefunds.$inferSelect,
  input: RefundInput,
) {
  return (
    refund.paymentId === input.paymentId &&
    refund.amountMinor === input.amountMinor &&
    refund.reason === input.reason
  );
}

async function reserveRefund(user: CurrentUser, input: RefundInput) {
  return getDb().transaction(async (tx) => {
    const existing = await tx.query.feeRefunds.findFirst({
      where: and(
        eq(feeRefunds.organizationId, user.organizationId),
        eq(feeRefunds.idempotencyKey, input.idempotencyKey),
      ),
    });
    if (existing) {
      if (!sameRefundRequest(existing, input))
        throw new AppError(
          "CONFLICT",
          "That refund request key was already used for different details.",
          409,
        );
      return existing;
    }
    const payment = await tx.query.feePayments.findFirst({
      where: and(
        eq(feePayments.id, input.paymentId),
        eq(feePayments.organizationId, user.organizationId),
        user.campusId ? eq(feePayments.campusId, user.campusId) : undefined,
        inArray(feePayments.status, ["posted", "partially_refunded"]),
      ),
    });
    if (!payment)
      throw new AppError(
        "NOT_FOUND",
        "Posted payment not found in your scope.",
        404,
      );
    const reservations = await tx.query.feeRefunds.findMany({
      where: and(
        eq(feeRefunds.organizationId, user.organizationId),
        eq(feeRefunds.paymentId, payment.id),
        inArray(feeRefunds.status, reservedRefundStatuses),
      ),
    });
    const reservedMinor = reservations.reduce(
      (total, refund) => total + refund.amountMinor,
      0,
    );
    const remainingMinor = payment.amountMinor - reservedMinor;
    if (input.amountMinor > remainingMinor)
      throw new AppError(
        "VALIDATION_ERROR",
        `Refund cannot exceed the remaining refundable amount of ${remainingMinor} minor units.`,
        422,
      );
    const [refund] = await tx
      .insert(feeRefunds)
      .values({
        organizationId: user.organizationId,
        campusId: payment.campusId,
        paymentId: payment.id,
        idempotencyKey: input.idempotencyKey,
        amountMinor: input.amountMinor,
        reason: input.reason,
        provider: payment.method === "online" ? "razorpay" : null,
        refundedBy: user.id,
        createdBy: user.id,
        updatedBy: user.id,
        status: "creating",
      })
      .returning();
    if (!refund)
      throw new AppError(
        "DATABASE_ERROR",
        "Unable to reserve the refund.",
        500,
      );
    return refund;
  });
}

export async function finalizeAuthorizedRefund(
  actor: RefundActor,
  refundId: string,
) {
  return getDb().transaction(async (tx) => {
    const refund = await tx.query.feeRefunds.findFirst({
      where: and(
        eq(feeRefunds.id, refundId),
        eq(feeRefunds.organizationId, actor.organizationId),
      ),
    });
    if (!refund) throw new AppError("NOT_FOUND", "Refund not found.", 404);
    const payment = await tx.query.feePayments.findFirst({
      where: and(
        eq(feePayments.id, refund.paymentId),
        eq(feePayments.organizationId, actor.organizationId),
      ),
    });
    if (!payment)
      throw new AppError(
        "CONFLICT",
        "The refund payment no longer exists.",
        409,
      );
    const invoice = await tx.query.feeInvoices.findFirst({
      where: and(
        eq(feeInvoices.id, payment.invoiceId),
        eq(feeInvoices.organizationId, actor.organizationId),
      ),
    });
    if (!invoice)
      throw new AppError(
        "CONFLICT",
        "The payment invoice no longer exists.",
        409,
      );
    if (refund.status === "completed") return { refund, payment, invoice };
    const [processing] = await tx
      .update(feeRefunds)
      .set({
        status: "processing",
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(feeRefunds.id, refund.id),
          inArray(feeRefunds.status, ["creating", "pending"]),
        ),
      )
      .returning();
    if (!processing)
      throw new AppError(
        "CONFLICT",
        "This refund is not ready for ledger finalization.",
        409,
      );
    const completedRefunds = await tx.query.feeRefunds.findMany({
      where: and(
        eq(feeRefunds.organizationId, actor.organizationId),
        eq(feeRefunds.paymentId, payment.id),
        eq(feeRefunds.status, "completed"),
        ne(feeRefunds.id, refund.id),
      ),
    });
    const refundedMinor = completedRefunds.reduce(
      (total, row) => total + row.amountMinor,
      0,
    );
    if (refundedMinor + refund.amountMinor > payment.amountMinor)
      throw new AppError(
        "CONFLICT",
        "Completed refunds would exceed the original payment.",
        409,
      );
    const newBalance = invoice.balanceMinor + refund.amountMinor;
    if (newBalance > invoice.totalMinor)
      throw new AppError(
        "CONFLICT",
        "The invoice balance cannot be increased beyond its total.",
        409,
      );
    const [updatedInvoice] = await tx
      .update(feeInvoices)
      .set({
        balanceMinor: newBalance,
        status: newBalance >= invoice.totalMinor ? "open" : "partial",
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
      .returning();
    if (!updatedInvoice)
      throw new AppError(
        "CONFLICT",
        "The invoice changed while the refund was being posted.",
        409,
      );
    const fullyRefunded =
      refundedMinor + refund.amountMinor === payment.amountMinor;
    await tx
      .update(feePayments)
      .set({
        status: fullyRefunded ? "refunded" : "partially_refunded",
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(feePayments.id, payment.id),
          eq(feePayments.organizationId, actor.organizationId),
        ),
      );
    const cashAccount = payment.method === "cash" ? "cash" : "bank";
    await tx.insert(ledgerEntries).values([
      {
        organizationId: actor.organizationId,
        campusId: payment.campusId,
        referenceType: "fee_refund",
        referenceId: refund.id,
        account: cashAccount,
        debitMinor: 0,
        creditMinor: refund.amountMinor,
        postedAt: new Date(),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      {
        organizationId: actor.organizationId,
        campusId: payment.campusId,
        referenceType: "fee_refund",
        referenceId: refund.id,
        account: "fee_receivable",
        debitMinor: refund.amountMinor,
        creditMinor: 0,
        postedAt: new Date(),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    ]);
    const [completed] = await tx
      .update(feeRefunds)
      .set({
        status: "completed",
        refundedAt: new Date(),
        failureDescription: null,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(eq(feeRefunds.id, refund.id))
      .returning();
    return {
      refund: completed ?? processing,
      payment,
      invoice: updatedInvoice,
    };
  });
}

async function validateProviderRefund(
  refund: typeof feeRefunds.$inferSelect,
  payment: typeof feePayments.$inferSelect,
  providerRefund: RazorpayRefund,
) {
  if (
    providerRefund.payment_id !== payment.providerReference ||
    providerRefund.amount !== refund.amountMinor ||
    providerRefund.currency !== "INR" ||
    providerRefund.receipt !== refund.id
  ) {
    await getDb()
      .update(feeRefunds)
      .set({
        status: "manual_review",
        providerRefundId: providerRefund.id,
        providerStatus: providerRefund.status,
        failureDescription:
          "Razorpay refund details did not match the ERP reservation.",
        updatedAt: new Date(),
      })
      .where(eq(feeRefunds.id, refund.id));
    throw new AppError(
      "CONFLICT",
      "The Razorpay refund requires manual reconciliation.",
      409,
    );
  }
}

export async function reconcileRazorpayRefund(
  actor: RefundActor,
  refund: typeof feeRefunds.$inferSelect,
  payment: typeof feePayments.$inferSelect,
  providerRefund: RazorpayRefund,
) {
  await validateProviderRefund(refund, payment, providerRefund);
  await getDb()
    .update(feeRefunds)
    .set({
      providerRefundId: providerRefund.id,
      providerStatus: providerRefund.status,
      status:
        providerRefund.status === "processed"
          ? "pending"
          : providerRefund.status === "failed"
            ? "failed"
            : "pending",
      failureDescription:
        providerRefund.status === "failed"
          ? "Razorpay could not process this refund."
          : null,
      updatedAt: new Date(),
      updatedBy: actor.userId,
    })
    .where(eq(feeRefunds.id, refund.id));
  if (providerRefund.status === "failed")
    throw new AppError(
      "INTEGRATION_ERROR",
      "Razorpay rejected the refund.",
      502,
    );
  if (providerRefund.status === "processed")
    return finalizeAuthorizedRefund(actor, refund.id);
  const invoice = await getDb().query.feeInvoices.findFirst({
    where: and(
      eq(feeInvoices.id, payment.invoiceId),
      eq(feeInvoices.organizationId, actor.organizationId),
    ),
  });
  if (!invoice)
    throw new AppError(
      "CONFLICT",
      "The payment invoice no longer exists.",
      409,
    );
  const pending = await getDb().query.feeRefunds.findFirst({
    where: eq(feeRefunds.id, refund.id),
  });
  return { refund: pending ?? refund, payment, invoice };
}

export async function refundPayment(
  user: CurrentUser,
  input: RefundInput,
  clientFactory: (configuration: {
    keyId: string;
    keySecret: string;
  }) => RazorpayClient = (configuration) => new RazorpayClient(configuration),
) {
  const refund = await reserveRefund(user, input);
  const payment = await getDb().query.feePayments.findFirst({
    where: and(
      eq(feePayments.id, refund.paymentId),
      eq(feePayments.organizationId, user.organizationId),
    ),
  });
  if (!payment)
    throw new AppError("CONFLICT", "The refund payment no longer exists.", 409);
  const actor = {
    organizationId: user.organizationId,
    campusId: payment.campusId,
    userId: user.id,
  };
  if (refund.status === "completed")
    return finalizeAuthorizedRefund(actor, refund.id);
  if (refund.status === "failed")
    throw new AppError(
      "CONFLICT",
      "That refund attempt failed permanently. Start a new attempt.",
      409,
    );
  if (payment.method !== "online")
    return finalizeAuthorizedRefund(actor, refund.id);
  if (!payment.providerReference)
    throw new AppError(
      "CONFLICT",
      "The online payment has no Razorpay payment reference.",
      409,
    );
  const { configuration } = await loadRazorpayConfiguration(
    user.organizationId,
  );
  const client = clientFactory(configuration);
  try {
    const providerRefund = refund.providerRefundId
      ? await client.fetchRefund(refund.providerRefundId)
      : await client.createRefund({
          paymentId: payment.providerReference,
          amount: refund.amountMinor,
          receipt: refund.id,
          idempotencyKey: input.idempotencyKey,
          notes: { reason: refund.reason.slice(0, 300) },
        });
    return reconcileRazorpayRefund(actor, refund, payment, providerRefund);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof RazorpayProviderError) {
      if (!error.retryable)
        await getDb()
          .update(feeRefunds)
          .set({
            status: "failed",
            failureDescription: error.message.slice(0, 500),
            updatedAt: new Date(),
            updatedBy: user.id,
          })
          .where(eq(feeRefunds.id, refund.id));
      throw new AppError("INTEGRATION_ERROR", error.message, error.status);
    }
    throw error;
  }
}
