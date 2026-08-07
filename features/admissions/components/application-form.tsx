"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { createApplicationAction } from "../actions/admissions.actions";
import { applicationSchema, type ApplicationInput } from "../schemas/admissions.schema";
import type { AdmissionOptions } from "../services/admissions.service";

export function ApplicationForm({ options }: { options: AdmissionOptions }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { campusId: options.campuses[0]?.id ?? "", sourceEnquiryId: "" },
  });
  const campusId = form.watch("campusId");
  const classId = form.watch("classId");
  const classes = options.classes.filter((row) => row.campusId === campusId);
  const years = options.academicYears.filter((row) => row.campusId === campusId);
  const sections = options.sections.filter((row) => row.campusId === campusId && row.classId === classId);
  const enquiries = options.enquiries.filter((row) => row.campusId === campusId);
  const submit = form.handleSubmit(async (input) => {
    setMessage("");
    const result = await createApplicationAction(input);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(result.message ?? "Application created.");
    form.reset({ campusId: options.campuses[0]?.id ?? "", sourceEnquiryId: "" });
    setOpen(false);
  });
  if (!open) return <Button className="mb-6" onClick={() => setOpen(true)}>New application</Button>;
  return <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField label="Campus" error={form.formState.errors.campusId?.message} register={form.register("campusId")} options={options.campuses} />
      <Field label="Applicant name" error={form.formState.errors.applicantName?.message}><Input {...form.register("applicantName")} /></Field>
      <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}><Input type="date" {...form.register("dateOfBirth", { setValueAs: (value) => value ? new Date(value) : undefined })} /></Field>
      <Field label="Gender" error={form.formState.errors.gender?.message}>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("gender")}>
          <option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option>
          <option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </Field>
      <SelectField label="Academic year" error={form.formState.errors.academicYearId?.message} register={form.register("academicYearId")} options={years} emptyLabel="Select year" />
      <SelectField label="Class" error={form.formState.errors.classId?.message} register={form.register("classId")} options={classes} emptyLabel="Select class" />
      <SelectField label="Section" error={form.formState.errors.sectionId?.message} register={form.register("sectionId")} options={sections} emptyLabel="Select section" />
      <SelectField label="Source enquiry" error={form.formState.errors.sourceEnquiryId?.message} register={form.register("sourceEnquiryId")} options={enquiries} emptyLabel="Direct application" />
    </div>
    <div className="mt-4 grid gap-4 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Guardian first name" error={form.formState.errors.guardian?.firstName?.message}><Input {...form.register("guardian.firstName")} /></Field>
      <Field label="Guardian last name" error={form.formState.errors.guardian?.lastName?.message}><Input {...form.register("guardian.lastName")} /></Field>
      <Field label="Relationship" error={form.formState.errors.guardian?.relationship?.message}><Input {...form.register("guardian.relationship")} /></Field>
      <Field label="Guardian email" error={form.formState.errors.guardian?.email?.message}><Input type="email" {...form.register("guardian.email")} /></Field>
      <Field label="Guardian phone" error={form.formState.errors.guardian?.phone?.message}><Input type="tel" {...form.register("guardian.phone")} /></Field>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button disabled={form.formState.isSubmitting || options.campuses.length === 0}>Create application</Button>
    </div>
  </form>;
}

function SelectField({
  label,
  error,
  register,
  options,
  emptyLabel,
}: {
  label: string;
  error?: string;
  register: UseFormRegisterReturn;
  options: Array<{ id: string; name: string }>;
  emptyLabel?: string;
}) {
  return <Field label={label} error={error}>
    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...register}>
      {emptyLabel ? <option value="">{emptyLabel}</option> : null}
      {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
  </Field>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}
