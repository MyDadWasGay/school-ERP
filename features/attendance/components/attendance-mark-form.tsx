"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { EntityCombobox } from "@/components/forms/entity-combobox";
import { markAttendanceAction } from "../actions/attendance.actions";
import { attendanceSchema, type AttendanceInput } from "../schemas/attendance.schema";
import { indiaTodayKey, parseIndiaDateInput } from "@/lib/utils/india-time";

export function AttendanceMarkForm({ students }: { students: Array<{ id: string; name: string; label?: string; detail?: string }> }) {
  const [message, setMessage] = useState("");
  const form = useForm<AttendanceInput>({
    resolver: zodResolver(attendanceSchema) as Resolver<AttendanceInput>,
    defaultValues: {
      studentId: students[0]?.id ?? "",
      periodKey: "daily",
      state: "present",
    },
  });
  const submit = form.handleSubmit(async (input) => {
    setMessage("");
    const result = await markAttendanceAction(input);
    setMessage(result.ok ? result.message ?? "Attendance marked." : result.error);
  });
  return <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <EntityCombobox label="Student" value={form.watch("studentId")} onChange={(value) => form.setValue("studentId", value, { shouldValidate: true })} endpoint="/api/v1/attendance/students/options" initialOptions={students.map((student) => ({ id: student.id, label: student.label ?? student.name, detail: student.detail }))} required error={form.formState.errors.studentId?.message} description="Search by student name or admission number." />
      <Field label="Date" error={form.formState.errors.attendanceDate?.message}>
        <Input type="date" defaultValue={indiaTodayKey()} {...form.register("attendanceDate", { setValueAs: (value) => value ? parseIndiaDateInput(value) : undefined })} />
      </Field>
      <Field label="Period" error={form.formState.errors.periodKey?.message}><Input {...form.register("periodKey")} /></Field>
      <Field label="Status" error={form.formState.errors.state?.message}>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("state")}>
          {["present", "absent", "late", "leave", "half_day", "medical"].map((state) => <option key={state} value={state}>{state.replaceAll("_", " ")}</option>)}
        </select>
      </Field>
      <Field label="Note" error={form.formState.errors.note?.message}><Input {...form.register("note")} /></Field>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={form.formState.isSubmitting || students.length === 0}>Save attendance</Button></div>
  </form>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}
