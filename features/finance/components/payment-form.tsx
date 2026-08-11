"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { createBrowserApiClient } from "@/lib/api-client/browser";

type PaymentOption = {
  id: string;
  studentId: string;
  label: string;
  balanceMinor: number;
};
const paymentFormSchema = z.object({
  invoiceId: z.string().min(1),
  amountRupees: z.coerce.number().positive().multipleOf(0.01),
  method: z.enum(["cash", "cheque", "card", "upi", "bank_transfer"]),
  providerReference: z.string().trim().max(120).optional(),
});
type PaymentFormInput = z.infer<typeof paymentFormSchema>;

export function PaymentForm({
  invoices,
  campusId,
}: {
  invoices: PaymentOption[];
  campusId?: string;
}) {
  const router = useRouter();
  const api = useMemo(() => createBrowserApiClient(campusId), [campusId]);
  const [message, setMessage] = useState("");
  const form = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { invoiceId: invoices[0]?.id ?? "", method: "cash" },
  });
  const selectedInvoiceId = form.watch("invoiceId");
  const invoice = useMemo(
    () => invoices.find((row) => row.id === selectedInvoiceId),
    [invoices, selectedInvoiceId],
  );
  const submit = form.handleSubmit(async (input) => {
    if (!invoice) return;
    const amountMinor = Math.round(input.amountRupees * 100);
    if (amountMinor > invoice.balanceMinor) {
      form.setError("amountRupees", {
        message: "Payment cannot exceed the invoice balance.",
      });
      return;
    }
    try {
      await api.collectPayment({
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amountMinor,
        method: input.method,
        providerReference: input.providerReference,
        idempotencyKey: crypto.randomUUID(),
      });
      setMessage("Payment collected and ledger posted.");
      form.reset({ invoiceId: invoices[0]?.id ?? "", method: "cash" });
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to collect payment.",
      );
    }
  });
  return (
    <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Invoice" error={form.formState.errors.invoiceId?.message}>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            {...form.register("invoiceId")}
          >
            {invoices.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Amount (INR)"
          error={form.formState.errors.amountRupees?.message}
        >
          <Input
            type="number"
            min="0.01"
            step="0.01"
            {...form.register("amountRupees")}
          />
        </Field>
        <Field
          label="Payment method"
          error={form.formState.errors.method?.message}
        >
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            {...form.register("method")}
          >
            {["cash", "cheque", "card", "upi", "bank_transfer"].map(
              (method) => (
                <option key={method} value={method}>
                  {method.replaceAll("_", " ")}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field
          label="Provider/reference"
          error={form.formState.errors.providerReference?.message}
        >
          <Input {...form.register("providerReference")} />
        </Field>
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button disabled={form.formState.isSubmitting || invoices.length === 0}>
          Collect payment
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
