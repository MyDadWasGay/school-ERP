"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/common/status-badge";
import { saveIntegrationConfigAction, setIntegrationStatusAction } from "../actions/integration.actions";

export function IntegrationConfigForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const config = Object.fromEntries(["endpoint", "apiKey", "accountId"].map((key) => [key, String(data.get(key) ?? "")]).filter(([, value]) => value));
    const result = await saveIntegrationConfigAction({ provider: String(data.get("provider") ?? ""), config });
    setMessage(result.ok ? result.message ?? "Saved." : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="rounded-lg border p-4" noValidate><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-2"><Label htmlFor="integration-provider">Provider key</Label><Input id="integration-provider" name="provider" required placeholder="sms_provider" /></div><div className="space-y-2"><Label htmlFor="integration-endpoint">Endpoint</Label><Input id="integration-endpoint" name="endpoint" type="url" required /></div><div className="space-y-2"><Label htmlFor="integration-api-key">API key</Label><Input id="integration-api-key" name="apiKey" type="password" required /></div><div className="space-y-2"><Label htmlFor="integration-account">Account ID</Label><Input id="integration-account" name="accountId" /></div></div>{message ? <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p> : null}<div className="mt-4 flex justify-end"><Button>Save encrypted configuration</Button></div></form>;
}

export function IntegrationConfigList({ rows, canManage }: { rows: Array<{ id: string; provider: string; status: string; updatedAt: string }>; canManage: boolean }) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  async function toggle(row: { id: string; provider: string; status: string }) {
    const status = row.status === "disabled" ? "configured" : "disabled";
    const result = await setIntegrationStatusAction({ id: row.id, status });
    setMessages((current) => ({ ...current, [row.id]: result.ok ? result.message ?? "Updated." : result.error }));
  }
  if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No integration configuration is stored for this tenant.</p>;
  return <div className="space-y-3">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{row.provider}</p><p className="text-sm text-muted-foreground">Updated {row.updatedAt}; secret values are never displayed.</p>{messages[row.id] ? <p role="status" className="mt-1 text-sm text-muted-foreground">{messages[row.id]}</p> : null}</div><div className="flex items-center gap-2"><StatusBadge status={row.status} />{canManage ? <Button size="sm" variant="outline" onClick={() => toggle(row)}>{row.status === "disabled" ? "Enable" : "Disable"}</Button> : null}</div></div>)}</div>;
}
