"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordAssessmentAction, scheduleAssessmentAction } from "../actions/admissions.actions";
import { formatIndiaDateTime, parseIndiaDateTimeInput } from "@/lib/utils/india-time";

type ApplicationActionRow = { id: string; campusId: string | null; openAssessment?: { id: string; assessmentType: string; scheduledAt: Date; outcome: string | null } };

export function ApplicationActions({ row }: { row: ApplicationActionRow }) {
  const [type, setType] = useState("interview");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");
  const [outcome, setOutcome] = useState("passed");
  const [message, setMessage] = useState("");
  async function schedule() {
    const result = await scheduleAssessmentAction({ applicationId: row.id, campusId: row.campusId ?? "", assessmentType: type, scheduledAt: scheduledAt ? parseIndiaDateTimeInput(scheduledAt) : undefined, notes });
    setMessage(result.ok ? result.message ?? "Scheduled." : result.error);
  }
  async function record() {
    if (!row.openAssessment) return;
    const result = await recordAssessmentAction({ id: row.openAssessment.id, score: score ? Number(score) : undefined, outcome, notes });
    setMessage(result.ok ? result.message ?? "Saved." : result.error);
  }
  return <details className="min-w-72"><summary className="cursor-pointer text-sm font-medium text-primary">Assessments</summary><div className="mt-2 space-y-2 rounded-md border bg-background p-3"><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={type} onChange={(event) => setType(event.target.value)}><option value="entrance_test">Entrance test</option><option value="interview">Interview</option><option value="interaction">Interaction</option></select><Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} aria-label="Assessment schedule" /><Input value={notes} onChange={(event) => setNotes(event.target.value)} aria-label="Assessment notes" placeholder="Notes" /><Button type="button" size="sm" onClick={schedule} disabled={!scheduledAt}>Schedule assessment</Button>{row.openAssessment ? <div className="space-y-2 border-t pt-2"><p className="text-xs text-muted-foreground">Open {row.openAssessment.assessmentType} scheduled {formatIndiaDateTime(row.openAssessment.scheduledAt)}</p><div className="flex gap-2"><Input type="number" min="0" max="1000" value={score} onChange={(event) => setScore(event.target.value)} aria-label="Assessment score" placeholder="Score" /><select className="h-9 flex-1 rounded-md border bg-background px-2 text-sm" value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="passed">Passed</option><option value="failed">Failed</option><option value="no_show">No show</option><option value="pending">Pending</option></select></div><Button type="button" size="sm" variant="secondary" onClick={record}>Save result</Button></div> : null}{message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}</div></details>;
}
