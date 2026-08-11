import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  RazorpayClient,
  RazorpayProviderError,
  razorpayConfigurationSchema,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/integrations/razorpay";

const configuration = {
  keyId: "rzp_test_school123",
  keySecret: "razorpay-test-key-secret",
  webhookSecret: "razorpay-test-webhook-secret",
};

describe("Razorpay provider boundary", () => {
  it("creates an INR order with Basic authentication and no partial payments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "order_school123",
          entity: "order",
          amount: 5000,
          amount_paid: 0,
          amount_due: 5000,
          currency: "INR",
          receipt: "serp_receipt_1",
          status: "created",
          attempts: 0,
          created_at: 1786250000,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new RazorpayClient(configuration, fetchMock);

    await expect(
      client.createOrder({
        amount: 5000,
        currency: "INR",
        receipt: "serp_receipt_1",
        notes: { invoiceId: "invoice-1" },
      }),
    ).resolves.toMatchObject({ id: "order_school123", status: "created" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.razorpay.com/v1/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: `Basic ${Buffer.from(`${configuration.keyId}:${configuration.keySecret}`).toString("base64")}`,
        }),
        body: JSON.stringify({
          amount: 5000,
          currency: "INR",
          receipt: "serp_receipt_1",
          notes: { invoiceId: "invoice-1" },
          partial_payment: false,
        }),
      }),
    );
  });

  it("verifies checkout and raw webhook signatures without accepting tampering", () => {
    const orderId = "order_school123";
    const paymentId = "pay_school123";
    const checkoutSignature = createHmac("sha256", configuration.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const rawBody = '{"event":"payment.captured","amount":5000}';
    const webhookSignature = createHmac("sha256", configuration.webhookSecret)
      .update(rawBody)
      .digest("hex");

    expect(
      verifyRazorpayCheckoutSignature({
        orderId,
        paymentId,
        signature: checkoutSignature,
        keySecret: configuration.keySecret,
      }),
    ).toBe(true);
    expect(
      verifyRazorpayCheckoutSignature({
        orderId,
        paymentId: `${paymentId}-tampered`,
        signature: checkoutSignature,
        keySecret: configuration.keySecret,
      }),
    ).toBe(false);
    expect(
      verifyRazorpayWebhookSignature({
        rawBody,
        signature: webhookSignature,
        webhookSecret: configuration.webhookSecret,
      }),
    ).toBe(true);
    expect(
      verifyRazorpayWebhookSignature({
        rawBody: `${rawBody} `,
        signature: webhookSignature,
        webhookSecret: configuration.webhookSecret,
      }),
    ).toBe(false);
  });

  it("creates idempotent normal refunds in minor units", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "rfnd_school123",
          entity: "refund",
          amount: 2500,
          currency: "INR",
          payment_id: "pay_school123",
          receipt: "refund_local_123",
          status: "pending",
          created_at: 1786250000,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new RazorpayClient(configuration, fetchMock);

    await expect(
      client.createRefund({
        paymentId: "pay_school123",
        amount: 2500,
        receipt: "refund_local_123",
        idempotencyKey: "refund-attempt-123",
        notes: { reason: "Approved correction" },
      }),
    ).resolves.toMatchObject({ id: "rfnd_school123", status: "pending" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.razorpay.com/v1/payments/pay_school123/refund",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-refund-idempotency": "refund-attempt-123",
        }),
        body: JSON.stringify({
          amount: 2500,
          speed: "normal",
          receipt: "refund_local_123",
          notes: { reason: "Approved correction" },
        }),
      }),
    );
  });

  it("fails closed for malformed responses and production test keys", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "unexpected" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new RazorpayClient(configuration, fetchMock);

    await expect(
      client.createOrder({ amount: 5000, currency: "INR", receipt: "r1" }),
    ).rejects.toBeInstanceOf(RazorpayProviderError);
    const previous = process.env.CONFIG_ENV;
    process.env.CONFIG_ENV = "production";
    expect(razorpayConfigurationSchema.safeParse(configuration).success).toBe(
      false,
    );
    if (previous === undefined) delete process.env.CONFIG_ENV;
    else process.env.CONFIG_ENV = previous;
  });
});
