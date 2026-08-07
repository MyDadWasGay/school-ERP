"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeFollowUpAction, createFollowUpAction, updateEnquiryAction } from "../actions/admissions.actions";

type EnquiryActionRow = {
  id: string;
  status: string;
  source: string | null;
  campaign: string | null;
  nextFollowUpAt: Date | null;
  lostReason: string | null;
  openFollowUp?: { id: string; dueAt: Date; note: string };
};

export function EnquiryActions({ row }: { row: EnquiryActionRow }) {
  const [status, setStatus] = useState(row.status);
  const [source, setSource] = useState(row.source ?? "direct");
  const [campaign, setCampaign] = useState(row.campaign ?? "");
  const [lostReason, setLostReason] = useState(row.lostReason ?? "");
  const [followUpAt, setFollowUpAt] = useState(row.nextFollowUpAt ? toDateTimeLocal(row.nextFollowUpAt) : "");
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState("");
  const [message, setMessage] = useState("");
  async function updatePipeline() {
    const result = await updateEnquiryAction({ id: row.id, status, source, campaign, lostReason, nextFollowUpAt: followUpAt ? new Date(followUpAt) : undefined });
    setMessage(result.ok ? result.message ?? "Updated." : result.error);
  }
  async function schedule() {
    const result = await createFollowUpAction({ enquiryId: row.id, dueAt: followUpAt ? new Date(followUpAt) : undefined, note });
    setMessage(result.ok ? result.message ?? "Scheduled." : result.error);
    if (result.ok) setNote("");
  }
  async function complete() {
    if (!row.openFollowUp) return;
    const result = await completeFollowUpAction({ id: row.openFollowUp.id, outcome });
    setMessage(result.ok ? result.message ?? "Completed." : result.error);
  }
  return <details className="min-w-72"><summary className="cursor-pointer text-sm font-medium text-primary">Manage</summary><div className="mt-2 space-y-2 rounded-md border bg-background p-3"><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="lost">Lost</option><option value="converted">Converted</option></select><div className="grid gap-2 sm:grid-cols-2"><Input value={source} onChange={(event) => setSource(event.target.value)} aria-label="Lead source" placeholder="Source" /><Input value={campaign} onChange={(event) => setCampaign(event.target.value)} aria-label="Campaign" placeholder="Campaign" /></div>{status === "lost" ? <Input value={lostReason} onChange={(event) => setLostReason(event.target.value)} aria-label="Lost reason" placeholder="Lost reason" /> : null}<Input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} aria-label="Follow-up date" /><div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={updatePipeline}>Save pipeline</Button><Input className="h-9 min-w-40 flex-1" value={note} onChange={(event) => setNote(event.target.value)} aria-label="Follow-up note" placeholder="Follow-up note" /><Button type="button" size="sm" variant="outline" onClick={schedule} disabled={!followUpAt || !note}>Schedule</Button></div>{row.openFollowUp ? <div className="flex flex-wrap gap-2 border-t pt-2"><span className="text-xs text-muted-foreground">Open: {row.openFollowUp.note}</span><Input className="h-9 flex-1" value={outcome} onChange={(event) => setOutcome(event.target.value)} aria-label="Follow-up outcome" placeholder="Outcome" /><Button type="button" size="sm" variant="secondary" onClick={complete} disabled={!outcome}>Complete</Button></div> : null}{message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}</div></details>;
}

function toDateTimeLocal(value: Date) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
