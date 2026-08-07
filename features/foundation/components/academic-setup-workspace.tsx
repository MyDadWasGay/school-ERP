"use client";

import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [campusId, setCampusId] = useState(options.campuses[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const definition = copy[kind];
  async function submit(formData: FormData) {
    const base = { kind, campusId, name: String(formData.get("name") ?? "") };
    const input = kind === "academic_year"
      ? { ...base, startsOn: formData.get("startsOn"), endsOn: formData.get("endsOn"), isActive: formData.get("isActive") === "on" }
      : kind === "class"
        ? { ...base, code: formData.get("code"), sortOrder: formData.get("sortOrder") }
        : kind === "section"
          ? { ...base, classId: formData.get("classId"), capacity: formData.get("capacity") }
          : { ...base, code: formData.get("code"), isOptional: formData.get("isOptional") === "on" };
    const result = await createAcademicSetupAction(input);
    setMessage(result.ok ? result.message ?? "Saved." : result.error);
    if (result.ok) setOpen(false);
  }
  const classes = options.classes.filter((row) => row.campusId === campusId);
  return <div>
    <PageHeader title={definition.title} description={definition.description} />
    {canCreate ? open
      ? <form action={submit} className="mb-6 rounded-lg border p-4">
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
        {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
        <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!options.campuses.length || (kind === "section" && !classes.length)}>Create {definition.label}</Button></div>
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
