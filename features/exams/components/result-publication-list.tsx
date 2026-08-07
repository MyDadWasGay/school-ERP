"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { publishResultAction } from "../actions/exam.actions";

type ResultRow = { id: string; name: string; maxMarks: number; status: string; publishedAt?: string };

export function ResultPublicationList({ rows, canPublish }: { rows: ResultRow[]; canPublish: boolean }) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  async function publish(examId: string) {
    const result = await publishResultAction({ examId });
    setMessages((current) => ({ ...current, [examId]: result.ok ? result.message ?? "Published" : result.error }));
  }
  if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No result sets are available.</p>;
  return <div className="space-y-3">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
    <div><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">Maximum marks: {row.maxMarks}{row.publishedAt ? ` - Published ${row.publishedAt}` : ""}</p>{messages[row.id] ? <p role="status" className="mt-1 text-sm text-muted-foreground">{messages[row.id]}</p> : null}</div>
    <div className="flex items-center gap-2"><StatusBadge status={row.status} />{canPublish && ["moderation", "approved"].includes(row.status) ? <Button size="sm" onClick={() => publish(row.id)}>Publish results</Button> : null}</div>
  </div>)}</div>;
}
