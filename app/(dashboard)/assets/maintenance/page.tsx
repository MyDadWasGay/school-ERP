import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetMaintenanceForm, AssetMaintenanceStatusButton } from "@/features/assets/components/asset-workspace";
import { listAssetMaintenance, listAssets } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AssetMaintenancePage() {
  const user = await requirePermission("assets:read");
  const [assets, tickets] = await Promise.all([listAssets(user), listAssetMaintenance(user)]);
  return <div className="space-y-6"><PageHeader title="Asset maintenance" description="Open and resolve maintenance tickets against scoped assets with cost details and status history." />{hasPermission(user, "assets:update") ? <Card><CardHeader><CardTitle>New maintenance ticket</CardTitle></CardHeader><CardContent><AssetMaintenanceForm assets={assets} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Maintenance history</CardTitle></CardHeader><CardContent>{tickets.length ? <div className="space-y-3">{tickets.map((ticket) => <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{ticket.title}</p><p className="text-xs text-muted-foreground">{ticket.assetName} · {ticket.id}</p></div><div className="flex items-center gap-3"><Badge variant={ticket.status === "completed" ? "success" : "secondary"}>{ticket.status}</Badge>{hasPermission(user, "assets:update") && ticket.status === "open" ? <AssetMaintenanceStatusButton id={ticket.id} toStatus="in_progress" /> : null}{hasPermission(user, "assets:update") && ticket.status === "in_progress" ? <AssetMaintenanceStatusButton id={ticket.id} toStatus="completed" /> : null}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No maintenance tickets found.</p>}</CardContent></Card></div>;
}
