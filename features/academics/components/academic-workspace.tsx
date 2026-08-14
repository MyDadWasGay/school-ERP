"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EntityCombobox } from "@/components/forms/entity-combobox";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAcademicRecordAction, archiveAcademicRecordAction } from "../actions/academic.actions";
import type { AcademicKind } from "../schemas/academic.schema";
import { parseIndiaDateTimeInput } from "@/lib/utils/india-time";

type Row = { id: string; name: string; detail: string; status: string };
const labels: Record<AcademicKind, string> = { curriculum: "Curriculum", "lesson-plans": "Lesson plan", "teacher-allocation": "Teacher allocation", timetable: "Timetable template", substitutions: "Substitution", assignments: "Assignment", resources: "Teaching resource" };

export function AcademicWorkspace({ kind, rows, canCreate, canDelete }: { kind: AcademicKind; rows: Row[]; canCreate: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const label = labels[kind];

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const instant = date ? parseIndiaDateTimeInput(date) : undefined;
    const result = await createAcademicRecordAction({ kind, name, code, teacherId, classId, subjectId, scheduledFor: kind === "assignments" ? undefined : instant, dueAt: kind === "assignments" ? instant : undefined, details });
    setMessage(result.ok ? result.message ?? `${label} created.` : result.error);
    if (result.ok) {
      setName("");
      setCode("");
      setTeacherId("");
      setClassId("");
      setSubjectId("");
      setDate("");
      setDetails("");
      router.refresh();
    }
    setPending(false);
  }

  async function archive(id: string) {
    const result = await archiveAcademicRecordAction({ kind, id });
    if (!result.ok) {
      setMessage(result.error);
      throw new Error(result.error);
    }
    setMessage(result.message ?? "Archived.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{label} workflow</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Search the academic context by name or code. The server validates the selected records against the current organization and campus before saving.</p>
          {canCreate ? <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" noValidate>
            <div className="space-y-1"><Label htmlFor="academic-name">Name/title</Label><Input id="academic-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
            <div className="space-y-1"><Label htmlFor="academic-code">Code</Label><Input id="academic-code" value={code} onChange={(event) => setCode(event.target.value)} /></div>
            <EntityCombobox label="Teacher" value={teacherId} onChange={setTeacherId} endpoint="/api/v1/academics/options?kind=teacher" required={kind === "lesson-plans" || kind === "assignments"} description="Search by teacher name or email." />
            <EntityCombobox label="Class" value={classId} onChange={setClassId} endpoint="/api/v1/academics/options?kind=class" required={kind === "lesson-plans" || kind === "assignments"} description="Search by class name or code." />
            <EntityCombobox label="Subject" value={subjectId} onChange={setSubjectId} endpoint="/api/v1/academics/options?kind=subject" required={kind === "lesson-plans" || kind === "assignments"} description="Search by subject name or code." />
            <div className="space-y-1"><Label htmlFor="academic-date">{kind === "assignments" ? "Due date" : "Scheduled date"}</Label><Input id="academic-date" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} required={kind === "assignments" || kind === "lesson-plans"} /></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="academic-details">Details</Label><Input id="academic-details" value={details} onChange={(event) => setDetails(event.target.value)} /></div>
            <div className="flex items-end gap-3"><Button disabled={pending}>{pending ? "Creating..." : `Create ${label}`}</Button>{message ? <span role="status" className="text-sm text-muted-foreground">{message}</span> : null}</div>
          </form> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Scoped records ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{label} records</caption><thead><tr className="border-b text-left"><th scope="col" className="p-3">Name</th><th scope="col" className="p-3">Details</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3 text-right">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-3 font-medium">{row.name}</td><td className="p-3 text-muted-foreground">{row.detail}</td><td className="p-3"><StatusBadge status={row.status} /></td><td className="p-3 text-right">{canDelete && row.status !== "archived" ? <ConfirmDialog label="Archive" title={`Archive ${row.name}?`} description="This academic record will no longer be available for new teaching workflows. Existing references are retained." triggerVariant="outline" onConfirm={() => archive(row.id)} /> : null}</td></tr>)}</tbody></table></div> : <EmptyState title={`No ${label.toLowerCase()} records`} description="Create a record to begin this workflow." />}
        </CardContent>
      </Card>
    </div>
  );
}
