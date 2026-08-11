"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAcademicRecordAction, archiveAcademicRecordAction } from "../actions/academic.actions";
import type { AcademicKind } from "../schemas/academic.schema";

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
  const label = labels[kind];
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createAcademicRecordAction({ kind, name, code, teacherId, classId, subjectId, scheduledFor: kind === "assignments" ? undefined : date, dueAt: kind === "assignments" ? date : undefined, details });
    setMessage(result.ok ? result.message ?? `${label} created.` : result.error);
    if (result.ok) { setName(""); setCode(""); setTeacherId(""); setClassId(""); setSubjectId(""); setDate(""); setDetails(""); router.refresh(); }
  }
  async function archive(id: string) {
    const result = await archiveAcademicRecordAction({ kind, id });
    setMessage(result.ok ? result.message ?? "Archived." : result.error);
    if (result.ok) router.refresh();
  }
  return <div className="space-y-6"><Card><CardHeader><CardTitle>{label} workflow</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">Typed academic records are scoped to the current organization and campus. IDs are server-validated against the academic context before they are used by teaching workflows.</p>{canCreate ? <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" noValidate><div className="space-y-1"><Label htmlFor="academic-name">Name/title</Label><Input id="academic-name" value={name} onChange={(event) => setName(event.target.value)} required /></div><div className="space-y-1"><Label htmlFor="academic-code">Code</Label><Input id="academic-code" value={code} onChange={(event) => setCode(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="academic-teacher">Teacher ID</Label><Input id="academic-teacher" value={teacherId} onChange={(event) => setTeacherId(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="academic-class">Class ID</Label><Input id="academic-class" value={classId} onChange={(event) => setClassId(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="academic-subject">Subject ID</Label><Input id="academic-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="academic-date">{kind === "assignments" ? "Due date" : "Scheduled date"}</Label><Input id="academic-date" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} required={kind === "assignments" || kind === "lesson-plans"} /></div><div className="space-y-1 sm:col-span-2"><Label htmlFor="academic-details">Details</Label><Input id="academic-details" value={details} onChange={(event) => setDetails(event.target.value)} /></div><div className="flex items-end gap-3"><Button>Create {label}</Button>{message ? <span role="status" className="text-sm text-muted-foreground">{message}</span> : null}</div></form> : null}</CardContent></Card><Card><CardHeader><CardTitle>Scoped records ({rows.length})</CardTitle></CardHeader><CardContent>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Name</th><th className="p-3">Details</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-3 font-medium">{row.name}</td><td className="p-3 text-muted-foreground">{row.detail}</td><td className="p-3">{row.status}</td><td className="p-3 text-right">{canDelete ? <Button variant="ghost" size="sm" onClick={() => archive(row.id)}><Archive className="mr-1 h-3.5 w-3.5" />Archive</Button> : null}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No {label.toLowerCase()} records found.</p>}</CardContent></Card></div>;
}
