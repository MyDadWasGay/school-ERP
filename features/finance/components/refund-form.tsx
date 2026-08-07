"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { refundPaymentAction } from "../actions/payment.actions";

type RefundOption = { id: string; label: string; remainingMinor: number };

export function RefundForm({ payments }: { payments: RefundOption[] }) {
  const [paymentId, setPaymentId] = useState(payments[0]?.id ?? "");
  const [amountRupees, setAmountRupees] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const selected = useMemo(() => payments.find((row) => row.id === paymentId), [payments, paymentId]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await refundPaymentAction({
      paymentId,
      amountMinor: Math.round(Number(amountRupees) * 100),
      reason,
    });
    setMessage(result.ok ? result.message ?? "Refund posted." : result.error);
    if (result.ok) { setAmountRupees(""); setReason(""); }
  }
  return <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2"><Label htmlFor="refund-payment">Payment</Label><select id="refund-payment" value={paymentId} onChange={(event) => setPaymentId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Select payment</option>{payments.map((row) => <option key={row.id} value={row.id}>{row.label} · refundable ₹{(row.remainingMinor / 100).toFixed(2)}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="refund-amount">Amount (INR)</Label><Input id="refund-amount" value={amountRupees} onChange={(event) => setAmountRupees(event.target.value)} type="number" min="0.01" step="0.01" max={selected ? selected.remainingMinor / 100 : undefined} required /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="refund-reason">Reason</Label><Input id="refund-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={300} required placeholder="Duplicate payment or approved concession" /></div>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={!payments.length || !selected}>Post refund</Button></div>
  </form>;
}
