"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateMedicalProfileAction } from "../actions/student.actions";
import { medicalProfileSchema, type MedicalProfileInput } from "../schemas/student.schema";

export function MedicalProfileForm({ studentId, profile }: { studentId: string; profile?: { allergies?: string | null; conditions?: string | null; medications?: string | null; emergencyNotes?: string | null } | null }) {
  const [message, setMessage] = useState("");
  const form = useForm<MedicalProfileInput>({ resolver: zodResolver(medicalProfileSchema), defaultValues: { studentId, allergies: profile?.allergies ?? "", conditions: profile?.conditions ?? "", medications: profile?.medications ?? "", emergencyNotes: profile?.emergencyNotes ?? "" } });
  const submit = form.handleSubmit(async (input) => {
    const result = await updateMedicalProfileAction(input);
    setMessage(result.ok ? result.message ?? "Medical profile saved." : result.error);
  });
  return <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
    <p className="mb-4 text-sm text-muted-foreground">Sensitive health information is restricted to authorized staff and is recorded in the audit log.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <TextareaField label="Allergies" {...form.register("allergies")} />
      <TextareaField label="Conditions" {...form.register("conditions")} />
      <TextareaField label="Medications" {...form.register("medications")} />
      <TextareaField label="Emergency notes" {...form.register("emergencyNotes")} />
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save medical profile"}</Button></div>
  </form>;
}

function TextareaField({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className="space-y-2 text-sm"><span className="block font-medium">{label}</span><Textarea {...props} /></label>;
}
