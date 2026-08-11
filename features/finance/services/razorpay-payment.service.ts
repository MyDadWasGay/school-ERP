import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { feeInvoices, feePayments, paymentProviderOrders } from "@/db/schema";
import { loadRazorpayConfiguration } from "@/features/integrations/services/razorpay-config.service";
import { getReadableStudent } from "@/features/students/services/students.service";
import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/app-error";
import { databaseErrorIncludes } from "@/lib/errors/database-error";
import {
  RazorpayClient,
  RazorpayProviderError,
  verifyRazorpayCheckoutSignature,
  type RazorpayPayment,
} from "@/lib/integrations/razorpay";
import { createId } from "@/lib/utils/ids";
import { isPaymentAmountValid } from "./payment-rules";
import { postAuthorizedPayment } from "./payment.service";

export const createRazorpayOrderSchema = z.object({
  invoiceId: z.string().trim().min(1).max(200),
  studentId: z.string().trim().min(1).max(200),
  amountMinor: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export const verifyRazorpayPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(8).max(80),
  razorpayPaymentId: z.string().trim().min(8).max(80),
  razorpaySignature: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/),
});

export type CreateRazorpayOrderInput = z.infer<
  typeof createRazorpayOrderSchema
>;
export type VerifyRazorpayPaymentInput = z.infer<
  typeof verifyRazorpayPaymentSchema
>;

function providerReceipt(organizationId: string, idempotencyKey: string) {
  const digest = createHash("sha256")
    .update(`${organizationId}:${idempotencyKey}`)
    .digest("hex");
  return `serp_${digest.slice(0, 35)}`;
}

function assertSameOrderRequest(
  order: typeof paymentProviderOrders.$inferSelect,
  input: CreateRazorpayOrderInput,
) {
  if (
    order.invoiceId !== input.invoiceId ||
    order.studentId !== input.studentId ||
    order.amountMinor !== input.amountMinor
  ) {
    throw new AppError(
      "CONFLICT",
      "That online-payment request key was already used for different details.",
      409,
    );
  }
}

function providerFailure(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof RazorpayProviderError)
    return new AppError("INTEGRATION_ERROR", error.message, error.status);
  return new AppError(
    "INTEGRATION_ERROR",
    "Razorpay could not create the payment order.",
    503,
  );
}

function checkoutData(
  order: typeof paymentProviderOrders.$inferSelect,
  keyId: string,
  schoolName: string,
  customer: { name: string; email?: string | null; contact?: string | null },
) {
  if (!order.providerOrderId)
    throw new AppError(
      "INTEGRATION_ERROR",
      "The Razorpay order is not ready.",
      503,
    );
  return {
    paymentRequestId: order.id,
    keyId,
    orderId: order.providerOrderId,
    amountMinor: order.amountMinor,
    currency: order.currency,
    name: schoolName,
    description: `Fee payment for invoice ${order.invoiceId}`,
    prefill: {
      name: customer.name,
      email: customer.email ?? undefined,
      contact: customer.contact ?? undefined,
    },
    status: order.status,
  };
}

export async function createRazorpayOrder(
  user: CurrentUser,
  input: CreateRazorpayOrderInput,
  clientFactory: (configuration: {
    keyId: string;
    keySecret: string;
  }) => RazorpayClient = (configuration) => new RazorpayClient(configuration),
) {
  const student = await getReadableStudent(user, input.studentId);
  const invoice = await getDb().query.feeInvoices.findFirst({
    where: and(
      eq(feeInvoices.id, input.invoiceId),
      eq(feeInvoices.organizationId, user.organizationId),
      eq(feeInvoices.studentId, student.id),
      student.campusId ? eq(feeInvoices.campusId, student.campusId) : undefined,
    ),
  });
  if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found.", 404);
  if (!["open", "partial", "overdue"].includes(invoice.status))
    throw new AppError("CONFLICT", "This invoice is not payable.", 409);
  if (!isPaymentAmountValid(input.amountMinor, invoice.balanceMinor))
    throw new AppError(
      "VALIDATION_ERROR",
      "Payment must not exceed the outstanding balance.",
      422,
    );
  if (invoice.currency.toUpperCase() !== "INR")
    throw new AppError(
      "VALIDATION_ERROR",
      "Razorpay checkout currently supports INR invoices only.",
      422,
    );

  const { configuration } = await loadRazorpayConfiguration(
    user.organizationId,
  );
  const client = clientFactory(configuration);
  let localOrder = await getDb().query.paymentProviderOrders.findFirst({
    where: and(
      eq(paymentProviderOrders.organizationId, user.organizationId),
      eq(paymentProviderOrders.idempotencyKey, input.idempotencyKey),
    ),
  });
  if (localOrder) {
    assertSameOrderRequest(localOrder, input);
    if (localOrder.status === "failed")
      throw new AppError(
        "CONFLICT",
        "That Razorpay order failed permanently. Start a new payment attempt.",
        409,
      );
    if (["posted", "verified", "manual_review"].includes(localOrder.status))
      throw new AppError(
        "CONFLICT",
        localOrder.status === "posted"
          ? "This Razorpay payment has already been posted."
          : "This Razorpay payment is already being reconciled.",
        409,
      );
    if (localOrder.providerOrderId && localOrder.status === "created")
      return checkoutData(
        localOrder,
        configuration.keyId,
        user.organizationName ?? "School ERP",
        {
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          contact: student.phone,
        },
      );
  } else {
    try {
      [localOrder] = await getDb()
        .insert(paymentProviderOrders)
        .values({
          id: createId("provider_order"),
          organizationId: user.organizationId,
          campusId: invoice.campusId,
          provider: "razorpay",
          invoiceId: invoice.id,
          studentId: student.id,
          amountMinor: input.amountMinor,
          currency: "INR",
          receipt: providerReceipt(user.organizationId, input.idempotencyKey),
          idempotencyKey: input.idempotencyKey,
          status: "creating",
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();
    } catch (error) {
      const concurrent = await getDb().query.paymentProviderOrders.findFirst({
        where: and(
          eq(paymentProviderOrders.organizationId, user.organizationId),
          eq(paymentProviderOrders.idempotencyKey, input.idempotencyKey),
        ),
      });
      if (concurrent) {
        assertSameOrderRequest(concurrent, input);
        localOrder = concurrent;
      } else if (
        databaseErrorIncludes(
          error,
          "provider_orders_active_invoice_unique",
          "unique constraint failed: payment_provider_orders.organization_id, payment_provider_orders.invoice_id",
        )
      ) {
        throw new AppError(
          "CONFLICT",
          "Another online payment attempt is already active for this invoice.",
          409,
        );
      } else {
        throw error;
      }
    }
  }
  if (!localOrder)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to reserve the payment order.",
      500,
    );

  try {
    let providerOrder = await client.findOrderByReceipt(localOrder.receipt);
    providerOrder ??= await client.createOrder({
      amount: localOrder.amountMinor,
      currency: localOrder.currency,
      receipt: localOrder.receipt,
      notes: {
        invoiceId: localOrder.invoiceId,
        studentId: localOrder.studentId,
        organizationId: localOrder.organizationId,
      },
    });
    if (
      providerOrder.amount !== localOrder.amountMinor ||
      providerOrder.currency !== localOrder.currency ||
      providerOrder.receipt !== localOrder.receipt
    ) {
      throw new AppError(
        "INTEGRATION_ERROR",
        "Razorpay returned an order that does not match the invoice payment.",
        502,
      );
    }
    const [ready] = await getDb()
      .update(paymentProviderOrders)
      .set({
        providerOrderId: providerOrder.id,
        status: providerOrder.status === "paid" ? "manual_review" : "created",
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(
        and(
          eq(paymentProviderOrders.id, localOrder.id),
          eq(paymentProviderOrders.organizationId, user.organizationId),
          eq(paymentProviderOrders.status, "creating"),
        ),
      )
      .returning();
    const result =
      ready ??
      (await getDb().query.paymentProviderOrders.findFirst({
        where: eq(paymentProviderOrders.id, localOrder.id),
      }));
    if (!result)
      throw new AppError(
        "DATABASE_ERROR",
        "Unable to store the Razorpay order.",
        500,
      );
    if (result.status !== "created")
      throw new AppError(
        "CONFLICT",
        "The Razorpay order is already paid and requires webhook reconciliation.",
        409,
      );
    return checkoutData(
      result,
      configuration.keyId,
      user.organizationName ?? "School ERP",
      {
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        contact: student.phone,
      },
    );
  } catch (error) {
    const appError = providerFailure(error);
    if (error instanceof RazorpayProviderError && !error.retryable) {
      await getDb()
        .update(paymentProviderOrders)
        .set({
          status: "failed",
          failureCode: appError.code,
          failureDescription: appError.message.slice(0, 500),
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(paymentProviderOrders.id, localOrder.id));
    }
    throw appError;
  }
}

export async function reconcileCapturedRazorpayPayment(
  order: typeof paymentProviderOrders.$inferSelect,
  payment: RazorpayPayment,
) {
  if (
    payment.order_id !== order.providerOrderId ||
    payment.amount !== order.amountMinor ||
    payment.currency !== order.currency ||
    payment.status !== "captured" ||
    !payment.captured
  ) {
    await getDb()
      .update(paymentProviderOrders)
      .set({
        status: "manual_review",
        providerPaymentId: payment.id,
        failureCode: "PAYMENT_MISMATCH",
        failureDescription:
          "Captured payment details did not match the reserved provider order.",
        updatedAt: new Date(),
      })
      .where(eq(paymentProviderOrders.id, order.id));
    throw new AppError(
      "CONFLICT",
      "The captured Razorpay payment requires manual reconciliation.",
      409,
    );
  }

  await getDb()
    .update(paymentProviderOrders)
    .set({
      status: "verified",
      providerPaymentId: payment.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paymentProviderOrders.id, order.id),
        inArray(paymentProviderOrders.status, ["created", "verified"]),
      ),
    );
  try {
    const feePayment = await postAuthorizedPayment(
      {
        organizationId: order.organizationId,
        campusId: order.campusId,
        userId: order.createdBy ?? "razorpay_webhook",
      },
      {
        invoiceId: order.invoiceId,
        studentId: order.studentId,
        amountMinor: order.amountMinor,
        method: "online",
        providerReference: payment.id,
        idempotencyKey: `razorpay:${payment.id}`,
      },
    );
    const paidAt = new Date(payment.created_at * 1000);
    const [postedOrder] = await getDb()
      .update(paymentProviderOrders)
      .set({
        status: "posted",
        providerPaymentId: payment.id,
        paidAt,
        failureCode: null,
        failureDescription: null,
        updatedAt: new Date(),
      })
      .where(eq(paymentProviderOrders.id, order.id))
      .returning();
    return { order: postedOrder ?? order, payment: feePayment };
  } catch (error) {
    const existingPayment = await getDb().query.feePayments.findFirst({
      where: and(
        eq(feePayments.organizationId, order.organizationId),
        eq(feePayments.providerReference, payment.id),
      ),
    });
    if (existingPayment) {
      const [postedOrder] = await getDb()
        .update(paymentProviderOrders)
        .set({
          status: "posted",
          providerPaymentId: payment.id,
          paidAt: new Date(payment.created_at * 1000),
          updatedAt: new Date(),
        })
        .where(eq(paymentProviderOrders.id, order.id))
        .returning();
      return { order: postedOrder ?? order, payment: existingPayment };
    }
    await getDb()
      .update(paymentProviderOrders)
      .set({
        status: "manual_review",
        providerPaymentId: payment.id,
        failureCode: "POSTING_CONFLICT",
        failureDescription:
          "Razorpay captured funds but the ERP payment could not be posted automatically.",
        updatedAt: new Date(),
      })
      .where(eq(paymentProviderOrders.id, order.id));
    throw error;
  }
}

export async function verifyRazorpayPayment(
  user: CurrentUser,
  input: VerifyRazorpayPaymentInput,
  clientFactory: (configuration: {
    keyId: string;
    keySecret: string;
  }) => RazorpayClient = (configuration) => new RazorpayClient(configuration),
) {
  const order = await getDb().query.paymentProviderOrders.findFirst({
    where: and(
      eq(paymentProviderOrders.organizationId, user.organizationId),
      eq(paymentProviderOrders.provider, "razorpay"),
      eq(paymentProviderOrders.providerOrderId, input.razorpayOrderId),
    ),
  });
  if (!order) throw new AppError("NOT_FOUND", "Razorpay order not found.", 404);
  await getReadableStudent(user, order.studentId);
  if (order.status === "posted") {
    const existing = await getDb().query.feePayments.findFirst({
      where: and(
        eq(feePayments.organizationId, user.organizationId),
        eq(feePayments.providerReference, input.razorpayPaymentId),
      ),
    });
    if (existing) return { order, payment: existing };
  }
  const { configuration } = await loadRazorpayConfiguration(
    user.organizationId,
  );
  if (
    !verifyRazorpayCheckoutSignature({
      orderId: order.providerOrderId!,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
      keySecret: configuration.keySecret,
    })
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Razorpay payment signature verification failed.",
      401,
    );
  }
  let payment: RazorpayPayment;
  try {
    payment = await clientFactory(configuration).fetchPayment(
      input.razorpayPaymentId,
    );
  } catch (error) {
    throw providerFailure(error);
  }
  return reconcileCapturedRazorpayPayment(order, payment);
}
