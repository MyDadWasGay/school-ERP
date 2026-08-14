"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDisciplineIncidentAction, updateDisciplineStatusAction } from "../actions/attendance.actions";
import { parseIndiaDateTimeInput } from "@/lib/utils/india-time";

export function DisciplineForm({ students }: { students: Array<{ id: string; name: string }> }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createDisciplineIncidentAction({ studentId: String(data.get("studentId") ?? ""), severity: String(data.get("severity") ?? "medium"), title: String(data.get("title") ?? ""), details: String(data.get("details") ?? "") || undefined, confidential: data.get("confidential") === "on", occurredAt: parseIndiaDateTimeInput(String(data.get("occurredAt") ?? "")) });
    setMessage(result.ok ? result.message ?? "Incident recorded." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><div className="space-y-2"><Label htmlFor="incident-student">Student</Label><select id="incident-student" name="studentId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select student</option>{students.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="incident-severity">Severity</Label><select id="incident-severity" name="severity" defaultValue="medium" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>low</option><option>medium</option><option>high</option><option>critical</option></select></div><div className="space-y-2"><Label htmlFor="incident-title">Title</Label><Input id="incident-title" name="title" required minLength={3} maxLength={160} /></div><div className="space-y-2"><Label htmlFor="incident-date">Occurred at</Label><Input id="incident-date" name="occurredAt" type="datetime-local" required /></div><label className="flex items-center gap-2 pt-8 text-sm"><input type="checkbox" name="confidential" defaultChecked /> Confidential</label></div><div className="mt-4 space-y-2"><Label htmlFor="incident-details">Details</Label><textarea id="incident-details" name="details" maxLength={2000} className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" /></div>{message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}<div className="mt-4 flex justify-end"><Button disabled={!students.length}>Record incident</Button></div></form>;
}

export function DisciplineList({ rows, canUpdate }: { rows: Array<{ id: string; student: string; severity: string; title: string; details: string | null; occurredAt: string; status: string }>; canUpdate: boolean }) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  async function update(incidentId: string, status: "resolved" | "dismissed", throwOnError = false) {
    const result = await updateDisciplineStatusAction({ incidentId, status });
    setMessages((current) => ({ ...current, [incidentId]: result.ok ? result.message ?? "Updated." : result.error }));
    if (!result.ok && throwOnError) throw new Error(result.error);
  }
  if (!rows.length) return <EmptyState title="No sensitive incidents found" description="Recorded discipline incidents will appear here for authorized staff." />;
  return <div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{row.student} · {row.title}</p><p className="text-sm text-muted-foreground">{row.severity} · {row.occurredAt}{row.details ? ` · ${row.details}` : ""}</p></div><div className="flex items-center gap-2"><StatusBadge status={row.status} />{canUpdate && row.status === "open" ? <><Button size="sm" onClick={() => update(row.id, "resolved")}>Resolve</Button><ConfirmDialog label="Dismiss" title="Dismiss this incident?" description="The incident will be marked dismissed and the decision will remain in the confidential incident history." triggerVariant="outline" onConfirm={() => update(row.id, "dismissed", true)} /></> : null}</div></div>{messages[row.id] ? <p role="status" className="mt-2 text-sm text-muted-foreground">{messages[row.id]}</p> : null}</div>)}</div>;
}
