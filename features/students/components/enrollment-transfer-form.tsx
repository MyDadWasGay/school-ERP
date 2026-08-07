"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { transferEnrollmentAction } from "../actions/student.actions";
import { enrollmentTransferSchema, type EnrollmentTransferInput } from "../schemas/student.schema";
import type { StudentFormOption } from "../types";

export function EnrollmentTransferForm({ studentId, options }: { studentId: string; options: { academicYears: StudentFormOption[]; classes: StudentFormOption[]; sections: StudentFormOption[] } }) {
  const [message, setMessage] = useState("");
  const form = useForm<EnrollmentTransferInput>({
    resolver: zodResolver(enrollmentTransferSchema),
    defaultValues: { studentId, academicYearId: "", classId: "", sectionId: "", rollNumber: "", startsOn: new Date() },
  });
  const submit = form.handleSubmit(async (input) => {
    const result = await transferEnrollmentAction(input);
    setMessage(result.ok ? result.message ?? "Enrollment transferred." : result.error);
  });
  return <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
    <h2 className="mb-4 font-medium">Transfer enrollment</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Academic year" error={form.formState.errors.academicYearId?.message}><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("academicYearId")}><option value="">Select year</option>{options.academicYears.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>
      <Field label="Class" error={form.formState.errors.classId?.message}><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("classId")}><option value="">Select class</option>{options.classes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>
      <Field label="Section" error={form.formState.errors.sectionId?.message}><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("sectionId")}><option value="">Select section</option>{options.sections.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>
      <Field label="Roll number" error={form.formState.errors.rollNumber?.message}><Input {...form.register("rollNumber")} /></Field>
      <Field label="Effective date" error={form.formState.errors.startsOn?.message}><Input type="date" {...form.register("startsOn", { valueAsDate: true })} /></Field>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Transferring..." : "Transfer enrollment"}</Button></div>
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}
