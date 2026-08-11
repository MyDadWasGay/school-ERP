import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetDepreciationForm } from "@/features/assets/components/asset-workspace";
import { listAssetDepreciation, listAssets } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AssetDepreciationPage() {
  const user = await requirePermission("assets:read");
  const [assets, entries] = await Promise.all([listAssets(user), listAssetDepreciation(user)]);
  return <div className="space-y-6"><PageHeader title="Asset depreciation" description="Post one immutable depreciation entry per asset and accounting period while maintaining current book value." />{hasPermission(user, "assets:update") ? <Card><CardHeader><CardTitle>Post depreciation</CardTitle></CardHeader><CardContent><AssetDepreciationForm assets={assets} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Depreciation history</CardTitle></CardHeader><CardContent>{entries.length ? <div className="space-y-3">{entries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{entry.assetName}</p><p className="text-xs text-muted-foreground">Period {entry.period ?? "unknown"} · {entry.id}</p></div><Badge variant="success">{entry.status}</Badge></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No depreciation entries found.</p>}</CardContent></Card></div>;
}
