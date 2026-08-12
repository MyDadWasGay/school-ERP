"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApiKeyAction, setApiKeyStatusAction } from "../actions/integration.actions";

type ApiKeyRow = { id: string; name: string; prefix: string | null; status: string; createdAt: string; updatedAt: string };

export function ApiKeyWorkspace({ rows }: { rows: ApiKeyRow[] }) {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await createApiKeyAction({ name: String(data.get("name") ?? "") });
    setMessage(result.ok ? result.message ?? "Created." : result.error);
    if (result.ok) { setSecret(result.data.secret); event.currentTarget.reset(); }
  }
  async function toggle(row: ApiKeyRow, throwOnError = false) {
    const result = await setApiKeyStatusAction({ id: row.id, status: row.status === "active" ? "revoked" : "active" });
    setMessage(result.ok ? result.message ?? "Updated." : result.error);
    if (!result.ok && throwOnError) throw new Error(result.error);
  }
  return <div className="space-y-6">
    <form onSubmit={create} className="rounded-lg border p-4"><div className="flex flex-wrap items-end gap-4"><div className="min-w-64 flex-1 space-y-2"><Label htmlFor="api-key-name">Key name</Label><Input id="api-key-name" name="name" placeholder="Reporting connector" required /></div><Button>Create API key</Button></div>{message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}{secret ? <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm"><p className="font-medium">Copy this secret now</p><code className="mt-1 block break-all">{secret}</code></div> : null}</form>
    {rows.length ? <div className="space-y-3">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{row.name}</p><p className="font-mono text-xs text-muted-foreground">{row.prefix ?? "key"}••••</p><p className="text-xs text-muted-foreground">Created {row.createdAt}</p></div><div className="flex items-center gap-2"><StatusBadge status={row.status} />{row.status === "active" ? <ConfirmDialog label="Revoke" title={`Revoke ${row.name}?`} description="This API key will stop authenticating integrations immediately. Existing audit history is retained." triggerVariant="outline" onConfirm={() => toggle(row, true)} /> : <Button size="sm" variant="outline" onClick={() => toggle(row)}>Reactivate</Button>}</div></div>)}</div> : <EmptyState title="No API keys issued" description="Create an API key only for an integration that needs scoped access." />}
  </div>;
}
