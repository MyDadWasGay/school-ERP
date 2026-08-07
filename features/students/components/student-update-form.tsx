"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { updateStudentAction } from "../actions/student.actions";
import { studentUpdateSchema, type StudentUpdateInput } from "../schemas/student.schema";

export function StudentUpdateForm({ student }: { student: StudentUpdateInput }) {
  const [message, setMessage] = useState("");
  const form = useForm<StudentUpdateInput>({ resolver: zodResolver(studentUpdateSchema), defaultValues: student });
  const submit = form.handleSubmit(async (input) => {
    const result = await updateStudentAction(input);
    setMessage(result.ok ? result.message ?? "Student updated." : result.error);
  });
  return <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="First name" error={form.formState.errors.firstName?.message}><Input {...form.register("firstName")} /></Field>
      <Field label="Last name" error={form.formState.errors.lastName?.message}><Input {...form.register("lastName")} /></Field>
      <Field label="Gender" error={form.formState.errors.gender?.message}>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("gender")}>
          <option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option>
          <option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}><Input type="tel" {...form.register("phone")} /></Field>
      <Field label="Status" error={form.formState.errors.status?.message}>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("status")}>
          {["active", "inactive", "withdrawn", "graduated"].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </Field>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={form.formState.isSubmitting}>Save changes</Button></div>
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}
