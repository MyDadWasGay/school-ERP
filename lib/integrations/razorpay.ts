import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const razorpayId = z.string().trim().min(8).max(80);

export const razorpayConfigurationSchema = z
  .object({
    keyId: z
      .string()
      .trim()
      .regex(
        /^rzp_(test|live)_[A-Za-z0-9]+$/,
        "Enter a valid Razorpay Key ID.",
      ),
    keySecret: z.string().trim().min(8).max(200),
    webhookSecret: z.string().trim().min(8).max(200),
  })
  .superRefine((value, context) => {
    const production =
      process.env.CONFIG_ENV === "production" ||
      (process.env.NODE_ENV === "production" &&
        process.env.CONFIG_ENV !== "ci");
    if (production && value.keyId.startsWith("rzp_test_")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["keyId"],
        message: "Razorpay test keys cannot be used in production.",
      });
    }
  });

export type RazorpayConfiguration = z.infer<typeof razorpayConfigurationSchema>;

const orderSchema = z.object({
  id: razorpayId,
  entity: z.literal("order"),
  amount: z.number().int().positive(),
  amount_paid: z.number().int().nonnegative(),
  amount_due: z.number().int().nonnegative(),
  currency: z.string().length(3),
  receipt: z.string().nullable().optional(),
  status: z.enum(["created", "attempted", "paid"]),
  attempts: z.number().int().nonnegative(),
  created_at: z.number().int().positive(),
});

const paymentSchema = z.object({
  id: razorpayId,
  entity: z.literal("payment"),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.enum(["created", "authorized", "captured", "refunded", "failed"]),
  order_id: razorpayId.nullable(),
  method: z.string().trim().min(1).max(40),
  captured: z.boolean(),
  amount_refunded: z.number().int().nonnegative().default(0),
  created_at: z.number().int().positive(),
});

const refundSchema = z.object({
  id: razorpayId,
  entity: z.literal("refund"),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  payment_id: razorpayId,
  receipt: z.string().max(120).nullable().optional(),
  status: z.enum(["pending", "processed", "failed"]),
  created_at: z.number().int().positive(),
});

const orderCollectionSchema = z.object({
  entity: z.literal("collection"),
  count: z.number().int().nonnegative(),
  items: z.array(orderSchema),
});

export type RazorpayOrder = z.infer<typeof orderSchema>;
export type RazorpayPayment = z.infer<typeof paymentSchema>;
export type RazorpayRefund = z.infer<typeof refundSchema>;

export class RazorpayProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "RazorpayProviderError";
  }
}

function safeHmacEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual.trim().toLowerCase(), "utf8");
  const expectedBuffer = Buffer.from(expected.toLowerCase(), "utf8");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function verifyRazorpayCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}) {
  const expected = createHmac("sha256", input.keySecret)
    .update(`${input.orderId}|${input.paymentId}`, "utf8")
    .digest("hex");
  return safeHmacEquals(input.signature, expected);
}

export function verifyRazorpayWebhookSignature(input: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}) {
  const expected = createHmac("sha256", input.webhookSecret)
    .update(input.rawBody, "utf8")
    .digest("hex");
  return safeHmacEquals(input.signature, expected);
}

export class RazorpayClient {
  constructor(
    private readonly configuration: Pick<
      RazorpayConfiguration,
      "keyId" | "keySecret"
    >,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request(path: string, init: RequestInit = {}) {
    let response: Response;
    try {
      response = await this.fetchImpl(`https://api.razorpay.com/v1${path}`, {
        ...init,
        headers: {
          accept: "application/json",
          authorization: `Basic ${Buffer.from(`${this.configuration.keyId}:${this.configuration.keySecret}`).toString("base64")}`,
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...init.headers,
        },
        signal: init.signal ?? AbortSignal.timeout(10_000),
      });
    } catch {
      throw new RazorpayProviderError(
        "Razorpay could not be reached. Try again safely with the same request key.",
        503,
        true,
      );
    }
    const payload = (await response.json().catch(() => undefined)) as
      { error?: { description?: unknown } } | undefined;
    if (!response.ok) {
      const description = payload?.error?.description;
      const retryable = response.status === 429 || response.status >= 500;
      throw new RazorpayProviderError(
        typeof description === "string" && description.length <= 300
          ? description
          : "Razorpay rejected the request.",
        retryable ? 503 : 502,
        retryable,
      );
    }
    return payload;
  }

  async createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }) {
    const payload = await this.request("/orders", {
      method: "POST",
      body: JSON.stringify({ ...input, partial_payment: false }),
    });
    const parsed = orderSchema.safeParse(payload);
    if (!parsed.success)
      throw new RazorpayProviderError(
        "Razorpay returned an invalid order response.",
        502,
        false,
      );
    return parsed.data;
  }

  async findOrderByReceipt(receipt: string) {
    const query = new URLSearchParams({ receipt, count: "1" });
    const payload = await this.request(`/orders?${query.toString()}`);
    const parsed = orderCollectionSchema.safeParse(payload);
    if (!parsed.success)
      throw new RazorpayProviderError(
        "Razorpay returned an invalid order list.",
        502,
        false,
      );
    return parsed.data.items.find((order) => order.receipt === receipt);
  }

  async fetchPayment(paymentId: string) {
    const payload = await this.request(
      `/payments/${encodeURIComponent(paymentId)}`,
    );
    const parsed = paymentSchema.safeParse(payload);
    if (!parsed.success)
      throw new RazorpayProviderError(
        "Razorpay returned an invalid payment response.",
        502,
        false,
      );
    return parsed.data;
  }

  async createRefund(input: {
    paymentId: string;
    amount: number;
    receipt: string;
    idempotencyKey: string;
    notes?: Record<string, string>;
  }) {
    const payload = await this.request(
      `/payments/${encodeURIComponent(input.paymentId)}/refund`,
      {
        method: "POST",
        headers: { "x-refund-idempotency": input.idempotencyKey },
        body: JSON.stringify({
          amount: input.amount,
          speed: "normal",
          receipt: input.receipt,
          notes: input.notes,
        }),
      },
    );
    const parsed = refundSchema.safeParse(payload);
    if (!parsed.success)
      throw new RazorpayProviderError(
        "Razorpay returned an invalid refund response.",
        502,
        false,
      );
    return parsed.data;
  }

  async fetchRefund(refundId: string) {
    const payload = await this.request(
      `/refunds/${encodeURIComponent(refundId)}`,
    );
    const parsed = refundSchema.safeParse(payload);
    if (!parsed.success)
      throw new RazorpayProviderError(
        "Razorpay returned an invalid refund response.",
        502,
        false,
      );
    return parsed.data;
  }
}
