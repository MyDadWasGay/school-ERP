"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { enterMarksAction } from "../actions/exam.actions";
import { marksSchema, type MarksInput } from "../schemas/marks.schema";
import type { ExamOption, StudentOption, SubjectOption } from "../services/exam-workspace.service";

export function MarksEntryForm({
  exams,
  students,
  subjects,
}: {
  exams: ExamOption[];
  students: StudentOption[];
  subjects: SubjectOption[];
}) {
  const [message, setMessage] = useState("");
  const form = useForm<MarksInput>({
    resolver: zodResolver(marksSchema),
    defaultValues: { examId: exams[0]?.id ?? "", studentId: students[0]?.id ?? "", subjectId: subjects[0]?.id ?? "" },
  });
  const examId = form.watch("examId");
  const exam = useMemo(() => exams.find((row) => row.id === examId), [examId, exams]);
  const submit = form.handleSubmit(async (input) => {
    const result = await enterMarksAction({ ...input, maxMarks: exam?.maxMarks });
    setMessage(result.ok ? result.message ?? "Marks saved." : result.error);
  });
  return <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField label="Exam" error={form.formState.errors.examId?.message} options={exams} registration={form.register("examId")} />
      <SelectField label="Student" error={form.formState.errors.studentId?.message} options={students} registration={form.register("studentId")} />
      <SelectField label="Subject" error={form.formState.errors.subjectId?.message} options={subjects} registration={form.register("subjectId")} />
      <Field label={`Marks${exam ? ` (max ${exam.maxMarks})` : ""}`} error={form.formState.errors.marks?.message}><Input type="number" min="0" max={exam?.maxMarks} {...form.register("marks")} /></Field>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={form.formState.isSubmitting || !exam || !students.length || !subjects.length}>Save marks</Button></div>
  </form>;
}

function SelectField({
  label,
  error,
  options,
  registration,
}: {
  label: string;
  error?: string;
  options: Array<{ id: string; name: string }>;
  registration: UseFormRegisterReturn;
}) {
  return <Field label={label} error={error}><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...registration}>
    {options.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
  </select></Field>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}
