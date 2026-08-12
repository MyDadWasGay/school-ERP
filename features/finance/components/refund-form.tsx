"use client";

import { useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserApiClient } from "@/lib/api-client/browser";

type RefundOption = { id: string; label: string; remainingMinor: number };

export function RefundForm({
  payments,
  campusId,
}: {
  payments: RefundOption[];
  campusId?: string;
}) {
  const api = useMemo(() => createBrowserApiClient(campusId), [campusId]);
  const [paymentId, setPaymentId] = useState(payments[0]?.id ?? "");
  const [amountRupees, setAmountRupees] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const selected = useMemo(
    () => payments.find((row) => row.id === paymentId),
    [payments, paymentId],
  );

  async function submitRefund() {
    if (!selected) throw new Error("Select a payment before submitting a refund.");
    const amountMinor = Math.round(Number(amountRupees) * 100);
    if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > selected.remainingMinor) {
      throw new Error("Enter a valid refund amount within the remaining refundable balance.");
    }
    if (reason.trim().length < 3) throw new Error("Enter a refund reason before submitting.");
    setPending(true);
    try {
      const storageKey = `school-erp:refund:${paymentId}`;
      const idempotencyKey =
        sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
      const result = await api.createRefund({
        paymentId,
        amountMinor,
        reason,
        idempotencyKey,
      });
      sessionStorage.removeItem(storageKey);
      setMessage(
        result.status === "completed"
          ? "Refund completed and the ledger was reversed."
          : "Refund accepted by Razorpay and awaiting final confirmation.",
      );
      setAmountRupees("");
      setReason("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to submit refund.",
      );
      throw error;
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={(event) => event.preventDefault()} className="mb-6 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="refund-payment">Payment</Label>
          <select
            id="refund-payment"
            value={paymentId}
            onChange={(event) => setPaymentId(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            required
          >
            <option value="">Select payment</option>
            {payments.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label} - refundable INR{" "}
                {(row.remainingMinor / 100).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="refund-amount">Amount (INR)</Label>
          <Input
            id="refund-amount"
            value={amountRupees}
            onChange={(event) => setAmountRupees(event.target.value)}
            type="number"
            min="0.01"
            step="0.01"
            max={selected ? selected.remainingMinor / 100 : undefined}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="refund-reason">Reason</Label>
          <Input
            id="refund-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={300}
            required
            placeholder="Duplicate payment or approved correction"
          />
        </div>
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <ConfirmDialog
          label={pending ? "Submitting..." : "Submit refund"}
          title="Confirm refund"
          description={`Refund INR ${amountRupees || "0.00"} for ${selected?.label ?? "the selected payment"}? The ledger will only be reversed after provider confirmation.`}
          disabled={pending || !payments.length || !selected}
          triggerVariant="default"
          onBeforeOpen={() => formRef.current?.reportValidity() ?? false}
          onConfirm={submitRefund}
        />
      </div>
    </form>
  );
}
