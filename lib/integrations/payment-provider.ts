export type PaymentIntent = { amountMinor: number; currency: string; reference: string; customerEmail?: string };
export type PaymentResult = { status: "pending" | "succeeded" | "failed"; providerReference?: string; error?: string };
export interface PaymentProvider { createPayment(input: PaymentIntent): Promise<PaymentResult>; refund(reference: string, amountMinor: number): Promise<PaymentResult>; }
