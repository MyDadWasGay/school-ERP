"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBrowserApiClient } from "@/lib/api-client/browser";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: { description?: string };
};

type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email?: string; contact?: string };
  handler: (response: RazorpaySuccess) => void | Promise<void>;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    callback: (event: RazorpayFailure) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let checkoutScriptPromise: Promise<void> | undefined;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Razorpay Checkout could not be loaded.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Razorpay Checkout could not be loaded."));
    document.head.appendChild(script);
  }).catch((error) => {
    checkoutScriptPromise = undefined;
    throw error;
  });
  return checkoutScriptPromise;
}

function storageKey(invoiceId: string) {
  return `school-erp:razorpay:${invoiceId}`;
}

function getIdempotencyKey(invoiceId: string) {
  const key = storageKey(invoiceId);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}

export function RazorpayPaymentButton({
  invoiceId,
  studentId,
  amountMinor,
  currency,
  campusId,
}: {
  invoiceId: string;
  studentId: string;
  amountMinor: number;
  currency: string;
  campusId?: string;
}) {
  const router = useRouter();
  const api = useMemo(() => createBrowserApiClient(campusId), [campusId]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function startPayment() {
    if (pending || amountMinor <= 0 || currency.toUpperCase() !== "INR") return;
    setPending(true);
    setMessage("Preparing secure checkout...");
    try {
      await loadRazorpayCheckout();
      if (!window.Razorpay)
        throw new Error("Razorpay Checkout is unavailable in this browser.");
      const order = await api.createRazorpayOrder({
        invoiceId,
        studentId,
        amountMinor,
        idempotencyKey: getIdempotencyKey(invoiceId),
      });
      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountMinor,
        currency: order.currency,
        name: order.name,
        description: order.description,
        prefill: order.prefill,
        handler: async (response) => {
          setMessage("Verifying the captured payment...");
          try {
            const payment = await api.verifyRazorpayPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            sessionStorage.removeItem(storageKey(invoiceId));
            setMessage(`Payment posted. Receipt ${payment.receiptNumber}.`);
            router.refresh();
          } catch (error) {
            setMessage(
              error instanceof Error
                ? `${error.message} The payment will also be reconciled by webhook.`
                : "Payment verification is pending webhook reconciliation.",
            );
          } finally {
            setPending(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPending(false);
            setMessage("Checkout closed. No ERP payment was posted.");
          },
        },
        theme: { color: "#2563eb" },
      });
      checkout.on("payment.failed", (event) => {
        setPending(false);
        setMessage(
          event.error?.description ?? "Razorpay reported a failed payment.",
        );
      });
      setMessage("");
      checkout.open();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start Razorpay Checkout.";
      if (message.includes("failed permanently"))
        sessionStorage.removeItem(storageKey(invoiceId));
      setMessage(message);
      setPending(false);
    }
  }

  if (amountMinor <= 0 || currency.toUpperCase() !== "INR") return null;
  return (
    <div className="min-w-32 space-y-1">
      <Button type="button" size="sm" disabled={pending} onClick={startPayment}>
        {pending ? "Opening..." : "Pay with Razorpay"}
      </Button>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="max-w-56 text-xs text-muted-foreground"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
