"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { createGuardianAction, unlinkGuardianAction } from "../actions/student.actions";
import { guardianSchema, type GuardianInput } from "../schemas/student.schema";

export function GuardianForm({ studentId }: { studentId: string }) {
  const [message, setMessage] = useState("");
  const form = useForm<GuardianInput>({
    resolver: zodResolver(guardianSchema),
    defaultValues: { studentId, firstName: "", lastName: "", relationship: "parent", email: "", phone: "", occupation: "", address: "", custodyNotes: "", isPrimary: false },
  });
  const submit = form.handleSubmit(async (input) => {
    const result = await createGuardianAction(input);
    setMessage(result.ok ? result.message ?? "Guardian linked." : result.error);
    if (result.ok) form.reset({ ...input, firstName: "", lastName: "", email: "", phone: "", occupation: "", address: "", custodyNotes: "", isPrimary: false });
  });
  return <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
    <h2 className="mb-4 font-medium">Add or link guardian</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" error={form.formState.errors.firstName?.message}><Input {...form.register("firstName")} /></Field>
      <Field label="Last name" error={form.formState.errors.lastName?.message}><Input {...form.register("lastName")} /></Field>
      <Field label="Relationship" error={form.formState.errors.relationship?.message}><Input {...form.register("relationship")} placeholder="Parent, guardian..." /></Field>
      <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}><Input type="tel" {...form.register("phone")} /></Field>
      <Field label="Occupation" error={form.formState.errors.occupation?.message}><Input {...form.register("occupation")} /></Field>
      <Field label="Address" error={form.formState.errors.address?.message}><Input {...form.register("address")} /></Field>
      <Field label="Custody notes" error={form.formState.errors.custodyNotes?.message}><Input {...form.register("custodyNotes")} /></Field>
    </div>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("isPrimary")} /> Make primary guardian</label>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save guardian"}</Button></div>
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}

export function GuardianUnlinkButton({ studentId, guardianId }: { studentId: string; guardianId: string }) {
  const [message, setMessage] = useState("");
  return <div className="flex items-center gap-2"><Button type="button" size="sm" variant="destructive" onClick={async () => {
    if (!window.confirm("Unlink this guardian from the student?")) return;
    const result = await unlinkGuardianAction({ studentId, guardianId });
    setMessage(result.ok ? "Unlinked" : result.error);
  }}>Unlink</Button>{message ? <span role="status" className="text-xs text-muted-foreground">{message}</span> : null}</div>;
}
