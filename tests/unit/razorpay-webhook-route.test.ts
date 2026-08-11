import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  receive: vi.fn(),
}));

vi.mock("@/features/integrations/services/razorpay-webhook.service", () => ({
  receiveRazorpayWebhook: mocks.receive,
}));

import { buildApi } from "@/server/api/app";

describe("Razorpay webhook HTTP boundary", () => {
  beforeEach(() => {
    mocks.receive.mockReset();
    mocks.receive.mockResolvedValue({
      id: "webhook-1",
      duplicate: false,
      processed: true,
    });
  });

  it("passes the exact raw body and Razorpay identity headers to verification", async () => {
    const rawBody = '{"entity":"event", "event":"payment.captured"}\n';
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/webhooks/razorpay/organization-1",
      headers: {
        "content-type": "application/json",
        "x-razorpay-event-id": "event_123",
        "x-razorpay-signature": "a".repeat(64),
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.receive).toHaveBeenCalledWith({
      organizationId: "organization-1",
      eventId: "event_123",
      signature: "a".repeat(64),
      rawBody,
    });
    await app.close();
  });

  it("rejects malformed identity headers before reading provider state", async () => {
    const app = await buildApi({ logger: false, documentation: false });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/webhooks/razorpay/organization-1",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });

    expect(response.statusCode).toBe(422);
    expect(mocks.receive).not.toHaveBeenCalled();
    await app.close();
  });
});
