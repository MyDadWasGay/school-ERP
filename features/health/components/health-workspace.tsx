"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClinicVisitAction, upsertHealthProfileAction } from "../actions/health.actions";

function Message({ value }: { value: string }) { return value ? <p role="status" className="text-sm text-muted-foreground">{value}</p> : null; }

export function HealthProfileForm({ students }: { students: Array<{ id: string; name: string }> }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await upsertHealthProfileAction({ studentId: data.get("studentId"), allergies: data.get("allergies"), conditions: data.get("conditions") }); setMessage(result.ok ? result.message ?? "Saved." : result.error); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="health-profile-student">Student</Label><select id="health-profile-student" name="studentId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="health-allergies">Allergies</Label><Textarea id="health-allergies" name="allergies" /></div><div className="space-y-2"><Label htmlFor="health-conditions">Conditions</Label><Textarea id="health-conditions" name="conditions" /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button disabled={!students.length}>Save profile</Button></div></form>;
}

export function ClinicVisitForm({ students }: { students: Array<{ id: string; name: string }> }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = await createClinicVisitAction({ studentId: data.get("studentId"), visitedAt: data.get("visitedAt"), summary: data.get("summary") }); setMessage(result.ok ? result.message ?? "Recorded." : result.error); if (result.ok) event.currentTarget.reset(); }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate><div className="space-y-2"><Label htmlFor="clinic-student">Student</Label><select id="clinic-student" name="studentId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Choose a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="clinic-date">Visit date/time</Label><Input id="clinic-date" name="visitedAt" type="datetime-local" required /></div><div className="space-y-2"><Label htmlFor="clinic-summary">Summary</Label><Textarea id="clinic-summary" name="summary" required /></div><div className="sm:col-span-3 flex items-center justify-between gap-3"><Message value={message} /><Button disabled={!students.length}>Record visit</Button></div></form>;
}
