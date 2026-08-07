"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { createInvoiceAction } from "../actions/invoice.actions";

const invoiceFormSchema = z.object({
  studentId: z.string().min(1),
  dueOn: z.string().min(1, "Due date is required."),
  description: z.string().trim().min(2).max(160),
  amountRupees: z.coerce.number().positive().multipleOf(0.01),
});
type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;

export function InvoiceForm({ students }: { students: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const form = useForm<InvoiceFormInput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: { studentId: students[0]?.id ?? "" },
  });
  const submit = form.handleSubmit(async (input) => {
    const result = await createInvoiceAction({
      studentId: input.studentId,
      dueOn: new Date(`${input.dueOn}T00:00:00`),
      description: input.description,
      amountMinor: Math.round(input.amountRupees * 100),
    });
    setMessage(result.ok ? result.message ?? "Invoice created." : result.error);
    if (result.ok) {
      form.reset({ studentId: students[0]?.id ?? "" });
      setOpen(false);
    }
  });
  if (!open) return <Button className="mb-6" onClick={() => setOpen(true)}>Generate invoice</Button>;
  return <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Student" error={form.formState.errors.studentId?.message}>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("studentId")}>
          {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>
      </Field>
      <Field label="Due date" error={form.formState.errors.dueOn?.message}><Input type="date" {...form.register("dueOn")} /></Field>
      <Field label="Description" error={form.formState.errors.description?.message}><Input {...form.register("description")} /></Field>
      <Field label="Amount (INR)" error={form.formState.errors.amountRupees?.message}><Input type="number" min="0.01" step="0.01" {...form.register("amountRupees")} /></Field>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={form.formState.isSubmitting || students.length === 0}>Create invoice</Button></div>
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}
