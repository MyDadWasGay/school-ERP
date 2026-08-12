import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetForm, AssetStatusButton } from "@/features/assets/components/asset-workspace";
import { listAllAssets } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

function assetDetails(value: string | null) { try { return value ? JSON.parse(value) as { category?: string; serialNumber?: string | null; bookValueMinor?: number } : {}; } catch { return {}; } }

export default async function AssetRegisterPage() {
  const user = await requirePermission("assets:read");
  const assets = await listAllAssets(user);
  return <div className="space-y-6"><PageHeader title="Asset register" description="Track owned assets, current book value, lifecycle state, and audit-safe status changes." />{hasPermission(user, "assets:create") ? <Card><CardHeader><CardTitle>Register asset</CardTitle></CardHeader><CardContent><AssetForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Registered assets</CardTitle></CardHeader><CardContent>{assets.length ? <div className="space-y-3">{assets.map((asset) => { const info = assetDetails(asset.detailsJson); return <div key={asset.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{asset.name} <span className="text-xs text-muted-foreground">{asset.code ?? asset.id}</span></p><p className="text-xs text-muted-foreground">{info.category ?? "Uncategorized"}{info.serialNumber ? ` · ${info.serialNumber}` : ""} · Book value {info.bookValueMinor ?? 0}</p></div><div className="flex items-center gap-3"><StatusBadge status={asset.status} />{hasPermission(user, "assets:update") && asset.status === "active" ? <AssetStatusButton id={asset.id} toStatus="retired" /> : null}{hasPermission(user, "assets:update") && asset.status === "retired" ? <AssetStatusButton id={asset.id} toStatus="active" /> : null}{hasPermission(user, "assets:update") && asset.status !== "disposed" ? <AssetStatusButton id={asset.id} toStatus="disposed" /> : null}</div></div>; })}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No assets found.</p>}</CardContent></Card></div>;
}
