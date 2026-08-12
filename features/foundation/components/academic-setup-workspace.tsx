"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAcademicSetupAction } from "../actions/academic-setup.actions";
import { AcademicSetupActions } from "./academic-setup-actions";
import type { AcademicSetupKind } from "../schemas/academic-setup.schema";
import type {
  AcademicSetupOptions,
  AcademicSetupRow,
} from "../services/academic-setup.service";

const copy = {
  academic_year: { title: "Academic years", description: "Configure date-bound sessions and enforce one active academic year across the organization.", label: "academic year" },
  class: { title: "Classes", description: "Manage campus-scoped class masters used by enrollment, attendance, fees and exams.", label: "class" },
  section: { title: "Sections", description: "Create class-linked sections with explicit seat capacity.", label: "section" },
  subject: { title: "Subjects", description: "Manage subject codes and elective status for academics and assessments.", label: "subject" },
} as const;

export function AcademicSetupWorkspace({
  kind,
  rows,
  options,
  canCreate,
}: {
  kind: AcademicSetupKind;
  rows: AcademicSetupRow[];
  options: AcademicSetupOptions;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [campusId, setCampusId] = useState(options.campuses[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const definition = copy[kind];
  async function submit(formData: FormData) {
    if (pending) return;
    setMessage("");
    setError("");
    setPending(true);
    const base = { kind, campusId, name: String(formData.get("name") ?? "") };
    const input = kind === "academic_year"
      ? { ...base, startsOn: formData.get("startsOn"), endsOn: formData.get("endsOn"), isActive: formData.get("isActive") === "on" }
      : kind === "class"
        ? { ...base, code: formData.get("code"), sortOrder: formData.get("sortOrder") }
        : kind === "section"
          ? { ...base, classId: formData.get("classId"), capacity: formData.get("capacity") }
          : { ...base, code: formData.get("code"), isOptional: formData.get("isOptional") === "on" };
    try {
      const result = await createAcademicSetupAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Saved.");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(new FormData(event.currentTarget));
  }
  const classes = options.classes.filter((row) => row.campusId === campusId);
  return <div>
    <PageHeader title={definition.title} description={definition.description} />
    {error ? <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
    {message ? <p role="status" className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p> : null}
    {canCreate ? open
      ? <form onSubmit={handleSubmit} className="mb-6 rounded-lg border p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Campus"><select name="campusId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={campusId} onChange={(event) => setCampusId(event.target.value)}>{options.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></Field>
          <Field label="Name"><Input name="name" required /></Field>
          {kind === "academic_year" ? <>
            <Field label="Starts on"><Input name="startsOn" type="date" required /></Field>
            <Field label="Ends on"><Input name="endsOn" type="date" required /></Field>
            <CheckField name="isActive" label="Make active" />
          </> : null}
          {kind === "class" ? <>
            <Field label="Code"><Input name="code" required /></Field>
            <Field label="Sort order"><Input name="sortOrder" type="number" min="0" defaultValue="0" required /></Field>
          </> : null}
          {kind === "section" ? <>
            <Field label="Class"><select name="classId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required>{classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
            <Field label="Capacity"><Input name="capacity" type="number" min="1" max="500" defaultValue="40" required /></Field>
          </> : null}
          {kind === "subject" ? <><Field label="Code"><Input name="code" required /></Field><CheckField name="isOptional" label="Optional subject" /></> : null}
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={pending || !options.campuses.length || (kind === "section" && !classes.length)}>{pending ? "Saving..." : `Create ${definition.label}`}</Button></div>
      </form>
      : <Button className="mb-6" onClick={() => setOpen(true)}>New {definition.label}</Button>
      : null}
    <Card><CardContent className="pt-6"><DataTable rows={rows} columns={[
      { key: "name", header: "Name", cell: (row) => <span className="font-medium">{row.name}</span> },
      { key: "detail", header: "Details", cell: (row) => row.detail },
      { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      { key: "actions", header: "Actions", cell: (row) => canCreate ? <AcademicSetupActions kind={kind} row={row} /> : null },
    ]} emptyTitle={`No ${definition.label}s found`} /></CardContent></Card>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function CheckField({ name, label }: { name: string; label: string }) {
  return <label className="flex h-10 items-center gap-2 self-end rounded-md border px-3 text-sm"><input type="checkbox" name={name} />{label}</label>;
}
