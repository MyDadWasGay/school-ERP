"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { reviewAttendanceCorrectionAction } from "../actions/attendance.actions";

type CorrectionRow = {
  id: string;
  student: string;
  currentState: string;
  requestedState: string;
  reason: string;
  status: string;
};

export function CorrectionReviewList({ rows, canReview }: { rows: CorrectionRow[]; canReview: boolean }) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  async function review(id: string, decision: "approved" | "rejected", throwOnError = false) {
    const result = await reviewAttendanceCorrectionAction({ correctionId: id, decision });
    setMessages((current) => ({ ...current, [id]: result.ok ? result.message ?? decision : result.error }));
    if (!result.ok && throwOnError) throw new Error(result.error);
  }
  if (rows.length === 0) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No pending correction requests.</p>;
  return <div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-lg border p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-medium">{row.student}</p><p className="text-sm text-muted-foreground">{row.currentState} to {row.requestedState} - {row.reason}</p></div>
      <StatusBadge status={row.status} />
    </div>
    {canReview ? <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => review(row.id, "approved")}>Approve</Button><ConfirmDialog label="Reject" title="Reject this attendance correction?" description="The requested attendance change will not be applied and the decision will be retained for audit." triggerVariant="destructive" onConfirm={() => review(row.id, "rejected", true)} /></div> : null}
    {messages[row.id] ? <p role="status" className="mt-2 text-sm text-muted-foreground">{messages[row.id]}</p> : null}
  </div>)}</div>;
}
