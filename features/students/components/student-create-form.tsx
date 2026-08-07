"use client";

import { forwardRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createStudentAction } from "../actions/student.actions";
import { studentSchema, type StudentInput } from "../schemas/student.schema";
import type { StudentFormOptions } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";

export function StudentCreateForm({ options, initiallyOpen = false }: { options: StudentFormOptions; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [addGuardian, setAddGuardian] = useState(false);
  const [result, setResult] = useState("");
  const form = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: { campusId: options.campuses[0]?.id ?? "", academicYearId: "", classId: "", sectionId: "" },
  });
  const campusId = form.watch("campusId");
  const classId = form.watch("classId");
  const availableYears = options.academicYears.filter((year) => !year.campusId || year.campusId === campusId);
  const availableClasses = options.classes.filter((classRow) => !classRow.campusId || classRow.campusId === campusId);
  const availableSections = options.sections.filter((section) => section.classId === classId && (!section.campusId || section.campusId === campusId));
  const campusField = form.register("campusId");
  const classField = form.register("classId");
  const submit = form.handleSubmit(async (values) => {
    setResult("");
    const response = await createStudentAction(values);
    if (!response.ok) {
      setResult(response.error);
      Object.entries(response.fieldErrors ?? {}).forEach(([field, messages]) => {
        form.setError(field as keyof StudentInput, { type: "server", message: messages?.[0] ?? response.error });
      });
      return;
    }
    setResult(response.message ?? "Saved");
    form.reset({ campusId: options.campuses[0]?.id ?? "", academicYearId: "", classId: "", sectionId: "" });
    setAddGuardian(false);
    setOpen(false);
  });
  if (!open) return <Button className="mb-6" onClick={() => setOpen(true)}>New student</Button>;
  return <form onSubmit={submit} className="mb-6 rounded-lg border bg-muted/20 p-4" noValidate>
    <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">Choose names from the lists below. Enrollment is optional; if you start it, select an academic year, class, and section.</div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <FormField label="Admission number" error={form.formState.errors.admissionNumber?.message}><Input {...form.register("admissionNumber")} /></FormField>
      <FormField label="First name" error={form.formState.errors.firstName?.message}><Input {...form.register("firstName")} /></FormField>
      <FormField label="Last name" error={form.formState.errors.lastName?.message}><Input {...form.register("lastName")} /></FormField>
      <FormField label="Campus" error={form.formState.errors.campusId?.message}><Select {...campusField} options={options.campuses} emptyLabel="Select a campus" onChange={(event) => { campusField.onChange(event); form.setValue("classId", ""); form.setValue("sectionId", ""); }} /></FormField>
      <FormField label="Date of birth" error={form.formState.errors.dateOfBirth?.message}><Input type="date" {...form.register("dateOfBirth", { setValueAs: (value) => value ? new Date(value) : undefined })} /></FormField>
      <FormField label="Gender" error={form.formState.errors.gender?.message}>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("gender")}>
          <option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option>
          <option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </FormField>
      <FormField label="Email (optional)" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></FormField>
      <FormField label="Phone (optional)" error={form.formState.errors.phone?.message}><Input type="tel" {...form.register("phone")} /></FormField>
      <FormField label="Academic year (optional)" error={form.formState.errors.academicYearId?.message}><Select {...form.register("academicYearId")} options={availableYears} emptyLabel="No enrollment yet" disabled={!campusId || availableYears.length === 0} /></FormField>
      <FormField label="Class (optional)" error={form.formState.errors.classId?.message}><Select {...classField} options={availableClasses} emptyLabel="No class selected" disabled={!campusId || availableClasses.length === 0} onChange={(event) => { classField.onChange(event); form.setValue("sectionId", ""); }} /></FormField>
      <FormField label="Section (optional)" error={form.formState.errors.sectionId?.message}><Select {...form.register("sectionId")} options={availableSections} emptyLabel={classId ? "Select a section" : "Choose a class first"} disabled={!classId || availableSections.length === 0} /></FormField>
      <FormField label="Roll number (optional)" error={form.formState.errors.rollNumber?.message}><Input {...form.register("rollNumber")} /></FormField>
    </div>
    <div className="mt-4">
      <Button type="button" variant="outline" size="sm" onClick={() => {
        setAddGuardian((current) => {
          if (current) form.unregister("guardian");
          return !current;
        });
      }}>{addGuardian ? "Remove guardian" : "Add guardian"}</Button>
    </div>
    {addGuardian ? <div className="mt-4 grid gap-4 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-5">
      <FormField label="Guardian first name" error={form.formState.errors.guardian?.firstName?.message}><Input {...form.register("guardian.firstName")} /></FormField>
      <FormField label="Guardian last name" error={form.formState.errors.guardian?.lastName?.message}><Input {...form.register("guardian.lastName")} /></FormField>
      <FormField label="Relationship" error={form.formState.errors.guardian?.relationship?.message}><Input {...form.register("guardian.relationship")} placeholder="Parent, guardian..." /></FormField>
      <FormField label="Guardian email" error={form.formState.errors.guardian?.email?.message}><Input type="email" {...form.register("guardian.email")} /></FormField>
      <FormField label="Guardian phone" error={form.formState.errors.guardian?.phone?.message}><Input type="tel" {...form.register("guardian.phone")} /></FormField>
    </div> : null}
    {!options.campuses.length ? <p className="mt-3 text-sm text-red-600">No active campuses are available. Create a campus before adding students.</p> : null}
    {result ? <p role="status" className="mt-3 text-sm text-muted-foreground">{result}</p> : null}
    <div className="mt-4 flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={form.formState.isSubmitting || !options.campuses.length}>{form.formState.isSubmitting ? "Saving…" : "Create student"}</Button></div>
  </form>;
}

const Select = forwardRef<HTMLSelectElement, { options: StudentFormOptions["campuses"]; emptyLabel: string } & React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ options, emptyLabel, className, ...props }, ref) {
  return <select ref={ref} {...props} className={`h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}><option value="">{emptyLabel}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}{option.code ? ` (${option.code})` : ""}</option>)}</select>;
});
Select.displayName = "StudentSelect";

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}
