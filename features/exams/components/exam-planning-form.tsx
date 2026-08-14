"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExamAction } from "../actions/exam.actions";
import { parseIndiaDateInput } from "@/lib/utils/india-time";

type Option = { id: string; name: string };

export function ExamPlanningForm({ academicYears }: { academicYears: Option[] }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const startsOn = String(data.get("startsOn") ?? "");
    const endsOn = String(data.get("endsOn") ?? "");
    const result = await createExamAction({
      academicYearId: String(data.get("academicYearId") ?? ""),
      name: String(data.get("name") ?? ""),
      maxMarks: String(data.get("maxMarks") ?? ""),
      startsOn: startsOn ? parseIndiaDateInput(startsOn) : undefined,
      endsOn: endsOn ? new Date(parseIndiaDateInput(endsOn).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined,
    });
    setMessage(result.ok ? result.message ?? "Exam created." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2"><Label htmlFor="exam-academic-year">Academic year</Label><select id="exam-academic-year" name="academicYearId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select year</option>{academicYears.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="exam-name">Exam name</Label><Input id="exam-name" name="name" required minLength={2} maxLength={120} placeholder="Mid-term examination" /></div>
      <div className="space-y-2"><Label htmlFor="exam-max-marks">Maximum marks</Label><Input id="exam-max-marks" name="maxMarks" required type="number" min="1" max="100000" defaultValue="100" /></div>
      <div className="space-y-2"><Label htmlFor="exam-starts-on">Starts on</Label><Input id="exam-starts-on" name="startsOn" type="date" /></div>
      <div className="space-y-2"><Label htmlFor="exam-ends-on">Ends on</Label><Input id="exam-ends-on" name="endsOn" type="date" /></div>
    </div>
    {message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    <div className="mt-4 flex justify-end"><Button disabled={!academicYears.length}>Create exam</Button></div>
  </form>;
}
