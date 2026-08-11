import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import {
  auditLogs,
  feePayments,
  feeRefunds,
  integrationLogs,
  paymentProviderOrders,
  webhookEvents,
} from "@/db/schema";
import { reconcileCapturedRazorpayPayment } from "@/features/finance/services/razorpay-payment.service";
import { reconcileRazorpayRefund } from "@/features/finance/services/refund.service";
import { loadRazorpayConfiguration } from "./razorpay-config.service";
import { AppError } from "@/lib/errors/app-error";
import { databaseErrorIncludes } from "@/lib/errors/database-error";
import {
  RazorpayClient,
  RazorpayProviderError,
  verifyRazorpayWebhookSignature,
} from "@/lib/integrations/razorpay";
import { encryptSecret } from "@/lib/security/secret-box";
import { createId } from "@/lib/utils/ids";

const paymentEntitySchema = z.object({
  id: z.string().trim().min(8).max(80),
  order_id: z.string().trim().min(8).max(80).nullable(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.string().trim().min(1).max(40),
  captured: z.boolean(),
  error_code: z.string().max(120).nullable().optional(),
  error_description: z.string().max(500).nullable().optional(),
});

const paymentWebhookSchema = z.object({
  entity: z.literal("event"),
  event: z.enum(["payment.captured", "payment.failed", "order.paid"]),
  payload: z.object({
    payment: z.object({ entity: paymentEntitySchema }),
  }),
});

const refundEntitySchema = z.object({
  id: z.string().trim().min(8).max(80),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  payment_id: z.string().trim().min(8).max(80),
  receipt: z.string().max(120).nullable().optional(),
  status: z.enum(["pending", "processed", "failed"]),
  created_at: z.number().int().positive(),
});

const refundWebhookSchema = z.object({
  entity: z.literal("event"),
  event: z.enum(["refund.processed", "refund.failed"]),
  payload: z.object({ refund: z.object({ entity: refundEntitySchema }) }),
});

const razorpayWebhookSchema = z.union([
  paymentWebhookSchema,
  refundWebhookSchema,
]);

async function recordIntegrationLog(input: {
  organizationId: string;
  campusId?: string | null;
  eventType: string;
  eventId: string;
  status: "received" | "processed" | "failed";
  error?: string;
}) {
  await getDb()
    .insert(integrationLogs)
    .values({
      id: createId("integration_log"),
      organizationId: input.organizationId,
      campusId: input.campusId,
      provider: "razorpay",
      eventType: input.eventType,
      payloadJson: JSON.stringify({ eventId: input.eventId }),
      error: input.error?.slice(0, 500),
      status: input.status,
    });
}

export async function receiveRazorpayWebhook(
  input: {
    organizationId: string;
    eventId: string;
    signature: string;
    rawBody: string;
  },
  clientFactory: (configuration: {
    keyId: string;
    keySecret: string;
  }) => RazorpayClient = (configuration) => new RazorpayClient(configuration),
) {
  const { configuration } = await loadRazorpayConfiguration(
    input.organizationId,
  );
  if (
    !verifyRazorpayWebhookSignature({
      rawBody: input.rawBody,
      signature: input.signature,
      webhookSecret: configuration.webhookSecret,
    })
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Razorpay webhook signature verification failed.",
      401,
    );
  }
  let payload: z.infer<typeof razorpayWebhookSchema>;
  try {
    payload = razorpayWebhookSchema.parse(JSON.parse(input.rawBody));
  } catch {
    throw new AppError(
      "VALIDATION_ERROR",
      "Razorpay webhook payload is invalid or unsupported.",
      422,
    );
  }
  const eventCode = `razorpay:${input.eventId}`;
  let event = await getDb().query.webhookEvents.findFirst({
    where: and(
      eq(webhookEvents.organizationId, input.organizationId),
      eq(webhookEvents.code, eventCode),
    ),
  });
  if (event?.status === "processed")
    return { duplicate: true as const, processed: true as const, id: event.id };
  if (!event) {
    try {
      [event] = await getDb()
        .insert(webhookEvents)
        .values({
          id: createId("webhook"),
          organizationId: input.organizationId,
          campusId: null,
          name: "razorpay",
          code: eventCode,
          referenceId: input.eventId,
          detailsJson: encryptSecret(
            JSON.stringify({
              eventType: payload.event,
              ...(payload.event.startsWith("refund.")
                ? {
                    refundId:
                      refundWebhookSchema.parse(payload).payload.refund.entity
                        .id,
                  }
                : {
                    paymentId:
                      paymentWebhookSchema.parse(payload).payload.payment.entity
                        .id,
                    providerOrderId:
                      paymentWebhookSchema.parse(payload).payload.payment.entity
                        .order_id ?? undefined,
                  }),
              receivedAt: new Date().toISOString(),
            }),
          ),
          status: "received",
          createdBy: null,
          updatedBy: null,
        })
        .returning();
    } catch (error) {
      if (
        !databaseErrorIncludes(
          error,
          "webhook_events_org_code_unique",
          "unique constraint failed: webhook_events.organization_id, webhook_events.code",
        )
      ) {
        throw error;
      }
      event = await getDb().query.webhookEvents.findFirst({
        where: and(
          eq(webhookEvents.organizationId, input.organizationId),
          eq(webhookEvents.code, eventCode),
        ),
      });
      if (event?.status === "processed")
        return {
          duplicate: true as const,
          processed: true as const,
          id: event.id,
        };
    }
  }
  if (!event)
    throw new AppError(
      "DATABASE_ERROR",
      "Unable to record the Razorpay webhook.",
      500,
    );

  try {
    if ("refund" in payload.payload) {
      const refundSnapshot = payload.payload.refund.entity;
      const refund = await getDb().query.feeRefunds.findFirst({
        where: and(
          eq(feeRefunds.organizationId, input.organizationId),
          eq(feeRefunds.provider, "razorpay"),
          or(
            eq(feeRefunds.providerRefundId, refundSnapshot.id),
            refundSnapshot.receipt
              ? eq(feeRefunds.id, refundSnapshot.receipt)
              : undefined,
          ),
        ),
      });
      if (!refund) {
        await getDb()
          .update(webhookEvents)
          .set({ status: "processed", updatedAt: new Date() })
          .where(eq(webhookEvents.id, event.id));
        await recordIntegrationLog({
          organizationId: input.organizationId,
          eventType: payload.event,
          eventId: input.eventId,
          status: "processed",
          error: "No School ERP refund matched this event.",
        });
        return {
          duplicate: false as const,
          processed: true as const,
          id: event.id,
        };
      }
      const payment = await getDb().query.feePayments.findFirst({
        where: and(
          eq(feePayments.id, refund.paymentId),
          eq(feePayments.organizationId, input.organizationId),
        ),
      });
      if (!payment)
        throw new AppError(
          "CONFLICT",
          "The refund payment no longer exists.",
          409,
        );
      const wasCompleted = refund.status === "completed";
      if (payload.event === "refund.failed") {
        if (!wasCompleted)
          await getDb()
            .update(feeRefunds)
            .set({
              status: "failed",
              providerRefundId: refundSnapshot.id,
              providerStatus: "failed",
              failureDescription: "Razorpay could not process this refund.",
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(feeRefunds.id, refund.id),
                inArray(feeRefunds.status, ["creating", "pending"]),
              ),
            );
      } else if (!wasCompleted) {
        const providerRefund = await clientFactory(configuration).fetchRefund(
          refundSnapshot.id,
        );
        const result = await reconcileRazorpayRefund(
          {
            organizationId: input.organizationId,
            campusId: refund.campusId,
            userId: refund.refundedBy ?? refund.createdBy ?? "razorpay_webhook",
          },
          refund,
          payment,
          providerRefund,
        );
        await getDb()
          .insert(auditLogs)
          .values({
            id: createId("audit"),
            organizationId: input.organizationId,
            campusId: refund.campusId,
            actorUserId: refund.refundedBy,
            actorRole: "razorpay_webhook",
            action: "refund_payment",
            module: "finance",
            entityType: "fee_refund",
            entityId: result.refund.id,
            afterJson: JSON.stringify({
              provider: "razorpay",
              providerRefundId: providerRefund.id,
              amountMinor: result.refund.amountMinor,
              status: result.refund.status,
            }),
            metadataJson: JSON.stringify({ eventId: input.eventId }),
            createdBy: refund.refundedBy,
            updatedBy: refund.refundedBy,
          });
      }
      await getDb()
        .update(webhookEvents)
        .set({ status: "processed", updatedAt: new Date() })
        .where(eq(webhookEvents.id, event.id));
      await recordIntegrationLog({
        organizationId: input.organizationId,
        campusId: refund.campusId,
        eventType: payload.event,
        eventId: input.eventId,
        status: "processed",
      });
      return {
        duplicate: false as const,
        processed: true as const,
        id: event.id,
      };
    }

    const paymentSnapshot = payload.payload.payment.entity;
    const providerOrderId = paymentSnapshot.order_id;
    const order = providerOrderId
      ? await getDb().query.paymentProviderOrders.findFirst({
          where: and(
            eq(paymentProviderOrders.organizationId, input.organizationId),
            eq(paymentProviderOrders.provider, "razorpay"),
            eq(paymentProviderOrders.providerOrderId, providerOrderId),
          ),
        })
      : undefined;
    if (!order) {
      await getDb()
        .update(webhookEvents)
        .set({ status: "processed", updatedAt: new Date() })
        .where(eq(webhookEvents.id, event.id));
      await recordIntegrationLog({
        organizationId: input.organizationId,
        eventType: payload.event,
        eventId: input.eventId,
        status: "processed",
        error: "No School ERP provider order matched this event.",
      });
      return {
        duplicate: false as const,
        processed: true as const,
        id: event.id,
      };
    }

    if (payload.event === "payment.failed") {
      if (["creating", "created"].includes(order.status)) {
        await getDb()
          .update(paymentProviderOrders)
          .set({
            providerPaymentId: paymentSnapshot.id,
            failureCode: paymentSnapshot.error_code ?? "PAYMENT_FAILED",
            failureDescription:
              paymentSnapshot.error_description ?? "Razorpay payment failed.",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(paymentProviderOrders.id, order.id),
              inArray(paymentProviderOrders.status, ["creating", "created"]),
            ),
          );
      }
    } else {
      const wasPosted = order.status === "posted";
      let payment;
      try {
        payment = await clientFactory(configuration).fetchPayment(
          paymentSnapshot.id,
        );
      } catch (error) {
        if (error instanceof RazorpayProviderError)
          throw new AppError("INTEGRATION_ERROR", error.message, error.status);
        throw error;
      }
      const result = await reconcileCapturedRazorpayPayment(order, payment);
      if (!wasPosted) {
        await getDb()
          .insert(auditLogs)
          .values({
            id: createId("audit"),
            organizationId: order.organizationId,
            campusId: order.campusId,
            actorUserId: order.createdBy,
            actorRole: "razorpay_webhook",
            action: "collect_payment",
            module: "finance",
            entityType: "fee_payment",
            entityId: result.payment.id,
            afterJson: JSON.stringify({
              provider: "razorpay",
              providerReference: result.payment.providerReference,
              amountMinor: result.payment.amountMinor,
              status: result.payment.status,
            }),
            metadataJson: JSON.stringify({ eventId: input.eventId }),
            createdBy: order.createdBy,
            updatedBy: order.createdBy,
          });
      }
    }
    await getDb()
      .update(webhookEvents)
      .set({ status: "processed", updatedAt: new Date() })
      .where(eq(webhookEvents.id, event.id));
    await recordIntegrationLog({
      organizationId: input.organizationId,
      campusId: order.campusId,
      eventType: payload.event,
      eventId: input.eventId,
      status: "processed",
    });
    return {
      duplicate: false as const,
      processed: true as const,
      id: event.id,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Razorpay webhook processing failed.";
    await getDb()
      .update(webhookEvents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(webhookEvents.id, event.id));
    await recordIntegrationLog({
      organizationId: input.organizationId,
      eventType: payload.event,
      eventId: input.eventId,
      status: "failed",
      error: message,
    });
    throw error;
  }
}
