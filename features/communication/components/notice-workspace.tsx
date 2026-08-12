"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNoticeAction, transitionNoticeAction } from "../actions/notice.actions";

type Row = { id: string; title: string; body: string; audience: string; status: string };

export function NoticeWorkspace({ rows, canCreate, canUpdate }: { rows: Row[]; canCreate: boolean; canUpdate: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createNoticeAction(Object.fromEntries(new FormData(event.currentTarget).entries()));
    setMessage(result.ok ? result.message ?? "Draft saved." : result.error);
    if (result.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  async function transition(id: string, status: "published" | "archived") {
    const result = await transitionNoticeAction({ id, status });
    if (!result.ok) {
      setMessage(result.error);
      throw new Error(result.error);
    }
    setMessage(result.message ?? (status === "published" ? "Notice published." : "Notice archived."));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canCreate ? (
        <form className="space-y-3 rounded-lg border p-4" onSubmit={create}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="notice-title">Title</Label>
              <Input id="notice-title" name="title" required />
            </div>
            <div>
              <Label htmlFor="notice-audience">Audience</Label>
              <select id="notice-audience" className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="audience">
                <option value="all">Everyone</option>
                <option value="students">Students</option>
                <option value="parents">Parents</option>
                <option value="teachers">Teachers</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="notice-body">Body</Label>
            <Textarea id="notice-body" name="body" required />
          </div>
          <div className="flex items-center gap-3">
            <Button>Save draft</Button>
            {message ? <span className="text-sm text-muted-foreground" role="status">{message}</span> : null}
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {rows.length ? rows.map((row) => (
          <article className="rounded-lg border p-4" key={row.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">{row.title}</h2>
                <p className="text-xs text-muted-foreground">Audience: {row.audience}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {canUpdate && row.status === "draft" ? (
                <ConfirmDialog
                  label="Publish"
                  title={`Publish ${row.title}?`}
                  description={`This notice will be delivered to the ${row.audience} audience and cannot be treated as a draft afterward.`}
                  triggerVariant="default"
                  confirmVariant="default"
                  onConfirm={() => transition(row.id, "published")}
                />
              ) : null}
              {canUpdate && row.status !== "archived" ? (
                <ConfirmDialog
                  label="Archive"
                  title={`Archive ${row.title}?`}
                  description="The notice will no longer be available as an active notice. Existing audit history is retained."
                  triggerVariant="outline"
                  onConfirm={() => transition(row.id, "archived")}
                />
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{row.body}</p>
          </article>
        )) : <EmptyState title="No notices found" description="Draft and published notices for this campus will appear here." />}
      </div>
    </div>
  );
}
