"use client";

import { useState } from "react";
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
  async function move(examId: string, status: string) {
    const result = await transitionExamStatusAction({ examId, status });
    setMessages((current) => ({ ...current, [examId]: result.ok ? result.message ?? "Status updated." : result.error }));
  }
  if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No exams have been planned yet.</p>;
  return <div className="space-y-3">{rows.map((row) => {
    const next = nextStatus[row.status];
    return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">Maximum marks: {row.maxMarks} · {row.scheduleCount} scheduled subject{row.scheduleCount === 1 ? "" : "s"}{row.startsOn ? ` · ${row.startsOn}` : ""}{row.endsOn ? ` to ${row.endsOn}` : ""}</p>{messages[row.id] ? <p role="status" className="mt-1 text-sm text-muted-foreground">{messages[row.id]}</p> : null}</div>
      <div className="flex items-center gap-2"><StatusBadge status={row.status} />{canManage && next ? <Button size="sm" onClick={() => move(row.id, next)}>{next === "published" ? "Publish results" : `Move to ${next.replaceAll("_", " ")}`}</Button> : null}</div>
    </div>;
  })}</div>;
}
