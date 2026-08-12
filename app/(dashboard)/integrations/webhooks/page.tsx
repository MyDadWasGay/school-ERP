import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listWebhookEvents } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function WebhooksPage() {
  const user = await requirePermission("integrations:read");
  const rows = await listWebhookEvents(user);
  return <div><PageHeader title="Webhook events" description="Tenant-scoped inbound events with signature validation, idempotent event IDs, and redacted payload history." /><Card><CardHeader><CardTitle>Recent events</CardTitle></CardHeader><CardContent>{rows.length ? <div className="space-y-2">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"><span><span className="font-medium">{row.provider}</span> · {row.eventId ?? row.eventCode}</span><span className="flex items-center gap-2 text-muted-foreground"><StatusBadge status={row.status} />{row.createdAt}</span></div>)}</div> : <EmptyState title="No webhook events" description="Validated inbound events will appear here when providers send them." />}</CardContent></Card></div>;
}
