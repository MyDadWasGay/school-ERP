"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveAdmissionAction } from "../actions/approval.actions";
import { reviewApplicationAction } from "../actions/admissions.actions";

type ReviewRow = { id: string; name: string; applicationNumber: string; status: string };

export function ApplicationReviewList({ rows, canApprove, canReject, canVerify }: { rows: ReviewRow[]; canApprove: boolean; canReject: boolean; canVerify: boolean }) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [rollNumbers, setRollNumbers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  async function verify(id: string) {
    setPending((current) => ({ ...current, [id]: true }));
    const result = await reviewApplicationAction({ applicationId: id, decision: "verified" });
    setMessages((current) => ({ ...current, [id]: result.ok ? result.message ?? "Verified." : result.error }));
    setPending((current) => ({ ...current, [id]: false }));
  }

  async function reject(id: string) {
    setPending((current) => ({ ...current, [id]: true }));
    const result = await reviewApplicationAction({ applicationId: id, decision: "rejected", reason: reasons[id] });
    if (!result.ok) {
      setMessages((current) => ({ ...current, [id]: result.error }));
      setPending((current) => ({ ...current, [id]: false }));
      throw new Error(result.error);
    }
    setMessages((current) => ({ ...current, [id]: result.message ?? "Rejected." }));
    setPending((current) => ({ ...current, [id]: false }));
  }

  async function approve(id: string) {
    setPending((current) => ({ ...current, [id]: true }));
    const result = await approveAdmissionAction({ applicationId: id, rollNumber: rollNumbers[id] });
    if (!result.ok) {
      setMessages((current) => ({ ...current, [id]: result.error }));
      setPending((current) => ({ ...current, [id]: false }));
      throw new Error(result.error);
    }
    setMessages((current) => ({ ...current, [id]: result.message ?? "Approved and enrolled." }));
    setPending((current) => ({ ...current, [id]: false }));
  }

  if (rows.length === 0) return <EmptyState title="No applications require review" description="New submitted applications will appear here." />;

  return <div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-lg border p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">{row.applicationNumber}</p></div>
      <StatusBadge status={row.status} />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {row.status === "submitted" && canVerify ? <Button size="sm" onClick={() => verify(row.id)} disabled={pending[row.id]}>{pending[row.id] ? "Verifying..." : "Mark documents verified"}</Button> : null}
      {["verified", "selected"].includes(row.status) && canApprove ? <>
        <Input className="h-9 w-40" aria-label={`Roll number for ${row.name}`} placeholder="Roll number" value={rollNumbers[row.id] ?? ""} onChange={(event) => setRollNumbers((current) => ({ ...current, [row.id]: event.target.value }))} />
        <ConfirmDialog label="Approve & enroll" title={`Approve ${row.name}?`} description={`This will enroll the applicant with roll number ${rollNumbers[row.id] || "to be assigned"}. Confirm the roll number and enrollment decision before continuing.`} triggerVariant="default" confirmVariant="default" disabled={pending[row.id]} onConfirm={() => approve(row.id)} />
      </> : null}
      {canReject ? <>
        <Input className="h-9 min-w-56 flex-1" aria-label={`Rejection reason for ${row.name}`} placeholder="Rejection reason" value={reasons[row.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [row.id]: event.target.value }))} />
        <ConfirmDialog label="Reject" title={`Reject ${row.name}'s application?`} description="The application will be marked rejected and the reason will be retained in the review history." triggerVariant="destructive" disabled={pending[row.id]} onConfirm={() => reject(row.id)} />
      </> : null}
    </div>
    {messages[row.id] ? <p role="status" className="mt-2 text-sm text-muted-foreground">{messages[row.id]}</p> : null}
  </div>)}</div>;
}
