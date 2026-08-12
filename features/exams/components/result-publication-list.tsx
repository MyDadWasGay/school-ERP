"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { publishResultAction } from "../actions/exam.actions";

type ResultRow = { id: string; name: string; maxMarks: number; status: string; publishedAt?: string };

export function ResultPublicationList({ rows, canPublish }: { rows: ResultRow[]; canPublish: boolean }) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  async function publish(examId: string) {
    setPending((current) => ({ ...current, [examId]: true }));
    const result = await publishResultAction({ examId });
    if (!result.ok) {
      setMessages((current) => ({ ...current, [examId]: result.error }));
      setPending((current) => ({ ...current, [examId]: false }));
      throw new Error(result.error);
    }
    setMessages((current) => ({ ...current, [examId]: result.message ?? "Published." }));
    setPending((current) => ({ ...current, [examId]: false }));
  }
  if (!rows.length) return <EmptyState title="No result sets are available" description="Approved result sets will appear here when they are ready to publish." />;
  return <div className="space-y-3">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
    <div><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">Maximum marks: {row.maxMarks}{row.publishedAt ? ` - Published ${row.publishedAt}` : ""}</p>{messages[row.id] ? <p role="status" className="mt-1 text-sm text-muted-foreground">{messages[row.id]}</p> : null}</div>
    <div className="flex items-center gap-2"><StatusBadge status={row.status} />{canPublish && ["moderation", "approved"].includes(row.status) ? <ConfirmDialog label="Publish results" title={`Publish ${row.name}?`} description="Published results become visible to the configured audience. Verify moderation and marks before continuing." triggerVariant="default" confirmVariant="default" disabled={pending[row.id]} onConfirm={() => publish(row.id)} /> : null}</div>
  </div>)}</div>;
}
