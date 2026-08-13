"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { createEnquiryAction } from "../actions/admissions.actions";
import { enquirySchema, type EnquiryInput } from "../schemas/admissions.schema";
import type { AdmissionOption } from "../services/admissions.service";

export function EnquiryForm({ campuses }: { campuses: AdmissionOption[] }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const form = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { campusId: campuses[0]?.id ?? "", source: "website", guardianName: "", guardianEmail: "", guardianPhone: "", notes: "" },
  });
  const submit = form.handleSubmit(async (input) => {
    setMessage("");
    const result = await createEnquiryAction(input);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(result.message ?? "Enquiry created.");
    form.reset({ campusId: campuses[0]?.id ?? "", source: "website", guardianName: "", guardianEmail: "", guardianPhone: "", notes: "" });
    setOpen(false);
  });
  if (!open) return <Button className="mb-6" onClick={() => setOpen(true)}>New enquiry</Button>;
  return <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate>
    <p className="mb-4 text-sm text-muted-foreground">An enquiry is a prospective family’s lead before a formal application. Capture enough contact context to follow up, then move the enquiry to an application when the family is ready.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Campus" error={form.formState.errors.campusId?.message}>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("campusId")}>
          {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
        </select>
      </Field>
      <Field label="Applicant name" error={form.formState.errors.applicantName?.message}><Input {...form.register("applicantName")} /></Field>
      <Field label="Guardian name" error={form.formState.errors.guardianName?.message}><Input {...form.register("guardianName")} /></Field>
      <Field label="Guardian email" error={form.formState.errors.guardianEmail?.message}><Input type="email" {...form.register("guardianEmail")} /></Field>
      <Field label="Guardian phone" error={form.formState.errors.guardianPhone?.message}><Input type="tel" {...form.register("guardianPhone")} /></Field>
      <Field label="Source" error={form.formState.errors.source?.message}><Input {...form.register("source")} /></Field>
      <Field label="Next follow-up" error={form.formState.errors.nextFollowUpAt?.message}>
        <Input type="datetime-local" {...form.register("nextFollowUpAt", { setValueAs: (value) => value ? new Date(value) : undefined })} />
      </Field>
      <Field label="Notes" error={form.formState.errors.notes?.message}><textarea className="min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" {...form.register("notes")} placeholder="Grade interest, questions, or context for the next conversation" /></Field>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button disabled={form.formState.isSubmitting || campuses.length === 0}>Create enquiry</Button>
    </div>
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}
