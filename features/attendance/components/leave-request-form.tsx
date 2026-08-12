"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createLeaveRequestAction,
  reviewLeaveRequestAction,
} from "../actions/attendance.actions";

export function LeaveRequestForm({
  students = [],
}: {
  students?: Array<{ id: string; name: string }>;
}) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createLeaveRequestAction({
      studentId: String(data.get("studentId") ?? "").trim() || undefined,
      startsOn: new Date(`${String(data.get("startsOn"))}T00:00:00`),
      endsOn: new Date(`${String(data.get("endsOn"))}T23:59:59`),
      reason: String(data.get("reason") ?? ""),
    });
    setMessage(
      result.ok ? (result.message ?? "Request submitted.") : result.error,
    );
    if (result.ok) event.currentTarget.reset();
  }
  return (
    <form onSubmit={submit} className="mb-6 rounded-lg border p-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        {students.length ? (
          <div className="space-y-2">
            <Label htmlFor="leave-student">Child</Label>
            <select
              id="leave-student"
              name="studentId"
              required
              className="h-10 w-full rounded-md border bg-background px-3"
            >
              <option value="">Choose a child</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="leave-start">Starts on</Label>
          <Input id="leave-start" name="startsOn" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-end">Ends on</Label>
          <Input id="leave-end" name="endsOn" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-reason">Reason</Label>
          <Input
            id="leave-reason"
            name="reason"
            required
            minLength={3}
            maxLength={500}
          />
        </div>
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button>Submit leave request</Button>
      </div>
    </form>
  );
}

export function LeaveRequestList({
  rows,
}: {
  rows: Array<{
    id: string;
    requester: string;
    startsOn: string;
    endsOn: string;
    reason: string;
    status: string;
    canReview: boolean;
  }>;
}) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  async function review(leaveId: string, decision: "approved" | "rejected", throwOnError = false) {
    const result = await reviewLeaveRequestAction({ leaveId, decision });
    setMessages((current) => ({
      ...current,
      [leaveId]: result.ok ? (result.message ?? "Updated.") : result.error,
    }));
    if (!result.ok && throwOnError) throw new Error(result.error);
  }
  if (!rows.length)
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No leave requests found.
      </p>
    );
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
        >
          <div>
            <p className="font-medium">
              {row.requester} · {row.startsOn} to {row.endsOn}
            </p>
            <p className="text-sm text-muted-foreground">{row.reason}</p>
            {messages[row.id] ? (
              <p role="status" className="mt-1 text-sm text-muted-foreground">
                {messages[row.id]}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
              <StatusBadge status={row.status} />
            {row.canReview ? (
              <>
                <Button size="sm" onClick={() => review(row.id, "approved")}>
                  Approve
                </Button>
                <ConfirmDialog
                  label="Reject"
                  title="Reject this leave request?"
                  description="The request will be marked rejected and the decision will remain in the leave history."
                  triggerVariant="outline"
                  onConfirm={() => review(row.id, "rejected", true)}
                />
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
