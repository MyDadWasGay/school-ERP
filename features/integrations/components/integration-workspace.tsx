"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/common/status-badge";
import {
  saveIntegrationConfigAction,
  saveRazorpayConfigurationAction,
  setIntegrationStatusAction,
} from "../actions/integration.actions";

export function RazorpayConfigForm({
  organizationId,
  appUrl,
}: {
  organizationId: string;
  appUrl: string;
}) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await saveRazorpayConfigurationAction({
      keyId: data.get("keyId"),
      keySecret: data.get("keySecret"),
      webhookSecret: data.get("webhookSecret"),
    });
    setMessage(result.ok ? (result.message ?? "Saved.") : result.error);
    if (result.ok) form.reset();
  }
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/v1/integrations/webhooks/razorpay/${encodeURIComponent(organizationId)}`;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="razorpay-key-id">Razorpay Key ID</Label>
          <Input
            id="razorpay-key-id"
            name="keyId"
            autoComplete="off"
            placeholder="rzp_test_..."
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="razorpay-key-secret">Razorpay Key Secret</Label>
          <Input
            id="razorpay-key-secret"
            name="keySecret"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="razorpay-webhook-secret">Webhook Secret</Label>
          <Input
            id="razorpay-webhook-secret"
            name="webhookSecret"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </div>
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Webhook URL</p>
        <code className="mt-1 block break-all text-xs">{webhookUrl}</code>
        <p className="mt-2 text-xs text-muted-foreground">
          Configure <code>payment.captured</code>, <code>payment.failed</code>,{" "}
          <code>order.paid</code>, <code>refund.processed</code> and{" "}
          <code>refund.failed</code>. Use the same webhook secret entered above.
        </p>
      </div>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button>Save Razorpay configuration</Button>
      </div>
    </form>
  );
}

export function IntegrationConfigForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const config = Object.fromEntries(
      ["endpoint", "apiKey", "accountId", "webhookSecret"]
        .map((key) => [key, String(data.get(key) ?? "")])
        .filter(([, value]) => value),
    );
    const result = await saveIntegrationConfigAction({
      provider: String(data.get("provider") ?? ""),
      config,
    });
    setMessage(result.ok ? (result.message ?? "Saved.") : result.error);
    if (result.ok) event.currentTarget.reset();
  }
  return (
    <form onSubmit={submit} className="rounded-lg border p-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="integration-provider">Provider key</Label>
          <Input
            id="integration-provider"
            name="provider"
            required
            placeholder="sms_provider"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="integration-endpoint">Endpoint</Label>
          <Input
            id="integration-endpoint"
            name="endpoint"
            type="url"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="integration-api-key">API key</Label>
          <Input
            id="integration-api-key"
            name="apiKey"
            type="password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="integration-account">Account ID</Label>
          <Input id="integration-account" name="accountId" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="integration-webhook-secret">Webhook secret</Label>
          <Input
            id="integration-webhook-secret"
            name="webhookSecret"
            type="password"
          />
        </div>
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button>Save encrypted configuration</Button>
      </div>
    </form>
  );
}

export function IntegrationConfigList({
  rows,
  canManage,
}: {
  rows: Array<{
    id: string;
    provider: string;
    status: string;
    updatedAt: string;
  }>;
  canManage: boolean;
}) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  async function toggle(row: { id: string; provider: string; status: string }) {
    const status = row.status === "disabled" ? "configured" : "disabled";
    const result = await setIntegrationStatusAction({ id: row.id, status });
    setMessages((current) => ({
      ...current,
      [row.id]: result.ok ? (result.message ?? "Updated.") : result.error,
    }));
  }
  if (!rows.length)
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No integration configuration is stored for this tenant.
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
            <p className="font-medium">{row.provider}</p>
            <p className="text-sm text-muted-foreground">
              Updated {row.updatedAt}; secret values are never displayed.
            </p>
            {messages[row.id] ? (
              <p role="status" className="mt-1 text-sm text-muted-foreground">
                {messages[row.id]}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => toggle(row)}>
                {row.status === "disabled" ? "Enable" : "Disable"}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
