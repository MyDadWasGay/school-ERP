"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDonationAction } from "../actions/accounting.actions";
import { indiaTodayKey } from "@/lib/utils/india-time";

export function DonationForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createDonationAction({ donorName: data.get("donorName"), donorEmail: data.get("donorEmail"), amountMinor: data.get("amountMinor"), purpose: data.get("purpose"), paymentReference: data.get("paymentReference"), receivedAt: data.get("receivedAt") });
    setMessage(result.ok ? result.message ?? "Recorded." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="donation-donor">Donor name</Label><Input id="donation-donor" name="donorName" required /></div><div className="space-y-2"><Label htmlFor="donation-email">Email</Label><Input id="donation-email" name="donorEmail" type="email" /></div><div className="space-y-2"><Label htmlFor="donation-amount">Amount (minor units)</Label><Input id="donation-amount" name="amountMinor" type="number" min="1" required /></div><div className="space-y-2"><Label htmlFor="donation-purpose">Purpose</Label><Input id="donation-purpose" name="purpose" required /></div><div className="space-y-2"><Label htmlFor="donation-reference">Payment reference</Label><Input id="donation-reference" name="paymentReference" /></div><div className="space-y-2"><Label htmlFor="donation-date">Received on</Label><Input id="donation-date" name="receivedAt" type="date" defaultValue={indiaTodayKey()} required /></div><div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{message}</p><Button>Record donation</Button></div></form>;
}
