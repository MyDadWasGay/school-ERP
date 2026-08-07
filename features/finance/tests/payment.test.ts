import { describe, expect, it } from "vitest";
import { isPaymentAmountValid } from "../services/payment-rules";
import { paymentSchema } from "../schemas/payment.schema";
describe("fee payments", () => {
  it("allows a positive partial payment within balance", () => expect(isPaymentAmountValid(5000, 10000)).toBe(true));
  it("rejects overpayment and fractional minor units", () => { expect(isPaymentAmountValid(10001, 10000)).toBe(false); expect(isPaymentAmountValid(10.5, 10000)).toBe(false); });
  it("validates payment methods and idempotency keys", () => {
    expect(paymentSchema.safeParse({ invoiceId: "i1", studentId: "s1", amountMinor: 5000, method: "upi", idempotencyKey: "request-123" }).success).toBe(true);
    expect(paymentSchema.safeParse({ invoiceId: "i1", studentId: "s1", amountMinor: 5000, method: "crypto" }).success).toBe(false);
  });
});
