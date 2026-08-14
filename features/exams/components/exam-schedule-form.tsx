"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scheduleExamAction } from "../actions/exam.actions";
import { parseIndiaDateTimeInput } from "@/lib/utils/india-time";

type Option = { id: string; name: string };

export function ExamScheduleForm({ exams, subjects, classes }: { exams: Option[]; subjects: Option[]; classes: Option[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const startsAt = String(data.get("startsAt") ?? "");
    const endsAt = String(data.get("endsAt") ?? "");
    const result = await scheduleExamAction({
      examId: String(data.get("examId") ?? ""),
      subjectId: String(data.get("subjectId") ?? ""),
      classId: String(data.get("classId") ?? ""),
      startsAt: startsAt ? parseIndiaDateTimeInput(startsAt) : undefined,
      endsAt: endsAt ? parseIndiaDateTimeInput(endsAt) : undefined,
      roomId: String(data.get("roomId") ?? "") || undefined,
    });
    setMessage(result.ok ? result.message ?? "Schedule saved." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <SelectField id="schedule-exam" name="examId" label="Exam" options={exams} />
      <SelectField id="schedule-subject" name="subjectId" label="Subject" options={subjects} />
      <SelectField id="schedule-class" name="classId" label="Class" options={classes} />
      <div className="space-y-2"><Label htmlFor="schedule-starts">Starts at</Label><Input id="schedule-starts" name="startsAt" type="datetime-local" required /></div>
      <div className="space-y-2"><Label htmlFor="schedule-ends">Ends at</Label><Input id="schedule-ends" name="endsAt" type="datetime-local" required /></div>
      <div className="space-y-2"><Label htmlFor="schedule-room">Room</Label><Input id="schedule-room" name="roomId" maxLength={80} placeholder="Room 101" /></div>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={!exams.length || !subjects.length || !classes.length}>Save schedule</Button></div>
  </form>;
}

function SelectField({ id, name, label, options }: { id: string; name: string; label: string; options: Option[] }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><select id={id} name={name} required className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select {label.toLowerCase()}</option>{options.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>;
}
