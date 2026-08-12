"use client";

import { forwardRef, useState } from "react";
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createStudentAction } from "../actions/student.actions";
import { studentSchema, type StudentInput } from "../schemas/student.schema";
import type { StudentFormOptions } from "../types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";

const defaultStudentValues = { campusId: "", academicYearId: "", classId: "", sectionId: "" };

export function StudentCreateForm({ options, initiallyOpen = false }: { options: StudentFormOptions; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [addGuardian, setAddGuardian] = useState(false);
  const [result, setResult] = useState("");
  const [createdStudentId, setCreatedStudentId] = useState<string>();
  const form = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: { ...defaultStudentValues, campusId: options.campuses[0]?.id ?? "" },
  });
  const campusId = form.watch("campusId");
  const classId = form.watch("classId");
  const availableYears = options.academicYears.filter((year) => !year.campusId || year.campusId === campusId);
  const availableClasses = options.classes.filter((classRow) => !classRow.campusId || classRow.campusId === campusId);
  const availableSections = options.sections.filter((section) => section.classId === classId && (!section.campusId || section.campusId === campusId));
  const campusField = form.register("campusId");
  const classField = form.register("classId");

  function openCreate() {
    setResult("");
    setCreatedStudentId(undefined);
    setOpen(true);
  }

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
    setResult(response.message ?? "Student created.");
    setCreatedStudentId(response.data.id);
    form.reset({ ...defaultStudentValues, campusId: options.campuses[0]?.id ?? "" });
    setAddGuardian(false);
    setOpen(false);
  });

  if (!open) return <div className="mb-6 space-y-3">
    {result ? <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900" role="status"><p className="font-medium">{result}</p><div className="mt-3 flex flex-wrap gap-2"><ButtonLink href="/students" variant="outline" size="sm">Return to students</ButtonLink>{createdStudentId ? <ButtonLink href={`/students/${createdStudentId}`} size="sm">Open student profile</ButtonLink> : null}<Button type="button" size="sm" variant="ghost" onClick={openCreate}>Create another</Button></div></div> : <Button onClick={openCreate}>New student</Button>}
  </div>;

  return <form onSubmit={submit} className="mb-6 space-y-5 rounded-lg border bg-muted/20 p-4" noValidate>
    <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">Required: admission number, name, and campus. Enrollment is optional; if you start it, select an academic year, class, and section together.</div>

    <fieldset className="rounded-md border bg-background p-4">
      <legend className="px-1 text-sm font-semibold">Personal information</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Admission number" error={form.formState.errors.admissionNumber?.message}><Input {...form.register("admissionNumber")} /></FormField>
        <FormField label="First name" error={form.formState.errors.firstName?.message}><Input {...form.register("firstName")} /></FormField>
        <FormField label="Last name" error={form.formState.errors.lastName?.message}><Input {...form.register("lastName")} /></FormField>
        <FormField label="Date of birth" error={form.formState.errors.dateOfBirth?.message}><Input type="date" {...form.register("dateOfBirth", { setValueAs: (value) => value ? new Date(value) : undefined })} /></FormField>
        <FormField label="Gender" error={form.formState.errors.gender?.message}><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("gender")}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option></select></FormField>
      </div>
    </fieldset>

    <fieldset className="rounded-md border bg-background p-4">
      <legend className="px-1 text-sm font-semibold">Enrollment <span className="font-normal text-muted-foreground">(optional)</span></legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <FormField label="Campus" error={form.formState.errors.campusId?.message}><Select {...campusField} options={options.campuses} emptyLabel="Select a campus" onChange={(event) => { campusField.onChange(event); form.setValue("classId", ""); form.setValue("sectionId", ""); }} /></FormField>
        <FormField label="Academic year" error={form.formState.errors.academicYearId?.message}><Select {...form.register("academicYearId")} options={availableYears} emptyLabel="No enrollment yet" disabled={!campusId || availableYears.length === 0} /></FormField>
        <FormField label="Class" error={form.formState.errors.classId?.message}><Select {...classField} options={availableClasses} emptyLabel="No class selected" disabled={!campusId || availableClasses.length === 0} onChange={(event) => { classField.onChange(event); form.setValue("sectionId", ""); }} /></FormField>
        <FormField label="Section" error={form.formState.errors.sectionId?.message}><Select {...form.register("sectionId")} options={availableSections} emptyLabel={classId ? "Select a section" : "Choose a class first"} disabled={!classId || availableSections.length === 0} /></FormField>
        <FormField label="Roll number" error={form.formState.errors.rollNumber?.message}><Input {...form.register("rollNumber")} /></FormField>
      </div>
      {form.formState.errors.academicYearId?.message ? <p className="mt-3 text-xs text-muted-foreground">To enroll the student, choose all three enrollment fields.</p> : null}
    </fieldset>

    <fieldset className="rounded-md border bg-background p-4">
      <legend className="px-1 text-sm font-semibold">Contact information <span className="font-normal text-muted-foreground">(optional)</span></legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></FormField>
        <FormField label="Phone" error={form.formState.errors.phone?.message}><Input type="tel" {...form.register("phone")} /></FormField>
      </div>
    </fieldset>

    <div>
      <Button type="button" variant="outline" size="sm" onClick={() => setAddGuardian((current) => { if (current) form.unregister("guardian"); return !current; })}>{addGuardian ? "Remove guardian" : "Add guardian details"}</Button>
      {addGuardian ? <fieldset className="mt-4 rounded-md border bg-background p-4"><legend className="px-1 text-sm font-semibold">Guardian</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <FormField label="First name" error={form.formState.errors.guardian?.firstName?.message}><Input {...form.register("guardian.firstName")} /></FormField>
        <FormField label="Last name" error={form.formState.errors.guardian?.lastName?.message}><Input {...form.register("guardian.lastName")} /></FormField>
        <FormField label="Relationship" error={form.formState.errors.guardian?.relationship?.message}><Input {...form.register("guardian.relationship")} placeholder="Parent, guardian..." /></FormField>
        <FormField label="Email" error={form.formState.errors.guardian?.email?.message}><Input type="email" {...form.register("guardian.email")} /></FormField>
        <FormField label="Phone" error={form.formState.errors.guardian?.phone?.message}><Input type="tel" {...form.register("guardian.phone")} /></FormField>
      </div></fieldset> : null}
    </div>

    {!options.campuses.length ? <p className="text-sm text-red-600" role="alert">No active campuses are available. Create a campus before adding students.</p> : null}
    {result ? <p role="alert" className="text-sm text-red-600">{result}</p> : null}
    <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => { setResult(""); setOpen(false); }}>Cancel</Button><Button disabled={form.formState.isSubmitting || !options.campuses.length}>{form.formState.isSubmitting ? "Saving..." : "Create student"}</Button></div>
  </form>;
}

const Select = forwardRef<HTMLSelectElement, { options: StudentFormOptions["campuses"]; emptyLabel: string } & React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ options, emptyLabel, className, ...props }, ref) {
  return <select ref={ref} {...props} className={`h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}><option value="">{emptyLabel}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}{option.code ? ` (${option.code})` : ""}</option>)}</select>;
});
Select.displayName = "StudentSelect";

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const child = children as React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
  const id = child.props.id ?? `student-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const errorId = `${id}-error`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{React.cloneElement(child, { id, "aria-describedby": error ? errorId : undefined, "aria-invalid": Boolean(error) })}<FieldError id={errorId} message={error} /></div>;
}
