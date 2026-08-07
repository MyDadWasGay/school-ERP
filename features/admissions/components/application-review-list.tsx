"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import { approveAdmissionAction } from "../actions/approval.actions";
import { reviewApplicationAction } from "../actions/admissions.actions";

type ReviewRow = { id: string; name: string; applicationNumber: string; status: string };

export function ApplicationReviewList({
  rows,
  canApprove,
  canReject,
  canVerify,
}: {
  rows: ReviewRow[];
  canApprove: boolean;
  canReject: boolean;
  canVerify: boolean;
}) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [rollNumbers, setRollNumbers] = useState<Record<string, string>>({});
  async function verify(id: string) {
    const result = await reviewApplicationAction({ applicationId: id, decision: "verified" });
    setMessages((current) => ({ ...current, [id]: result.ok ? result.message ?? "Verified" : result.error }));
  }
  async function reject(id: string) {
    const result = await reviewApplicationAction({ applicationId: id, decision: "rejected", reason: reasons[id] });
    setMessages((current) => ({ ...current, [id]: result.ok ? result.message ?? "Rejected" : result.error }));
  }
  async function approve(id: string) {
    const result = await approveAdmissionAction({ applicationId: id, rollNumber: rollNumbers[id] });
    setMessages((current) => ({ ...current, [id]: result.ok ? result.message ?? "Approved" : result.error }));
  }
  if (rows.length === 0) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No applications require review.</p>;
  return <div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-lg border p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">{row.applicationNumber}</p></div>
      <StatusBadge status={row.status} />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {row.status === "submitted" && canVerify ? <Button size="sm" onClick={() => verify(row.id)}>Mark documents verified</Button> : null}
      {["verified", "selected"].includes(row.status) && canApprove ? <>
        <Input className="h-9 w-40" placeholder="Roll number" value={rollNumbers[row.id] ?? ""} onChange={(event) => setRollNumbers((current) => ({ ...current, [row.id]: event.target.value }))} />
        <Button size="sm" onClick={() => approve(row.id)}>Approve & enroll</Button>
      </> : null}
      {canReject ? <>
        <Input className="h-9 min-w-56 flex-1" aria-label={`Rejection reason for ${row.name}`} placeholder="Rejection reason" value={reasons[row.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [row.id]: event.target.value }))} />
        <Button variant="destructive" size="sm" onClick={() => reject(row.id)}>Reject</Button>
      </> : null}
    </div>
    {messages[row.id] ? <p role="status" className="mt-2 text-sm text-muted-foreground">{messages[row.id]}</p> : null}
  </div>)}</div>;
}
