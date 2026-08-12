"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { transitionExamStatusAction } from "../actions/exam.actions";
import type { ExamPlanningRow } from "../services/exam-workspace.service";

const nextStatus: Record<string, string | undefined> = {
  draft: "planning",
  planning: "marks_entry",
  marks_entry: "moderation",
  moderation: "approved",
  approved: "published",
};

export function ExamPlanningList({ rows, canManage }: { rows: ExamPlanningRow[]; canManage: boolean }) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  async function move(examId: string, status: string, throwOnError = false) {
    setPending((current) => ({ ...current, [examId]: true }));
    const result = await transitionExamStatusAction({ examId, status });
    setMessages((current) => ({ ...current, [examId]: result.ok ? result.message ?? "Status updated." : result.error }));
    setPending((current) => ({ ...current, [examId]: false }));
    if (!result.ok && throwOnError) throw new Error(result.error);
  }
  if (!rows.length) return <EmptyState title="No exams have been planned yet" description="Create an exam plan before scheduling subjects and publishing results." />;
  return <div className="space-y-3">{rows.map((row) => {
    const next = nextStatus[row.status];
    return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">Maximum marks: {row.maxMarks} · {row.scheduleCount} scheduled subject{row.scheduleCount === 1 ? "" : "s"}{row.startsOn ? ` · ${row.startsOn}` : ""}{row.endsOn ? ` to ${row.endsOn}` : ""}</p>{messages[row.id] ? <p role="status" className="mt-1 text-sm text-muted-foreground">{messages[row.id]}</p> : null}</div>
      <div className="flex items-center gap-2"><StatusBadge status={row.status} />{canManage && next ? next === "published" ? <ConfirmDialog label="Publish results" title={`Publish ${row.name}?`} description="This will make the exam results visible to the configured audience. Confirm moderation is complete before continuing." triggerVariant="default" confirmVariant="default" disabled={pending[row.id]} onConfirm={() => move(row.id, next, true)} /> : <Button size="sm" onClick={() => move(row.id, next)} disabled={pending[row.id]}>{pending[row.id] ? "Updating..." : `Move to ${next.replaceAll("_", " ")}`}</Button> : null}</div>
    </div>;
  })}</div>;
}
