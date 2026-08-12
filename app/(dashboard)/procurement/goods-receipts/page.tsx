import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoodsReceiptForm } from "@/features/procurement/components/procurement-workspace";
import { listGoodsReceipts, listPurchaseOrders } from "@/lib/api-client/server-queries";
import { listInventoryItems } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ProcurementGoodsReceiptsPage() {
  const user = await requirePermission("procurement:read");
  const [orders, receipts, items] = await Promise.all([listPurchaseOrders(user), listGoodsReceipts(user), listInventoryItems(user)]);
  const ordered = orders.filter((order) => order.status === "ordered");
  return <div className="space-y-6">
    <PageHeader title="Goods receipts" description="Post received goods as one transaction that updates stock, records the receipt, and closes the purchase order." />
    {hasPermission(user, "procurement:update") ? <Card><CardHeader><CardTitle>Post receipt</CardTitle></CardHeader><CardContent><GoodsReceiptForm orders={ordered} items={items} /></CardContent></Card> : null}
    <Card><CardHeader><CardTitle>Receipt history</CardTitle></CardHeader><CardContent>{receipts.length ? <div className="space-y-3">{receipts.map((receipt) => <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{receipt.name}</p><p className="text-xs text-muted-foreground">{receipt.purchaseOrderId ?? "No purchase order reference"} · {new Date(receipt.createdAt).toLocaleString()}</p></div><StatusBadge status={receipt.status} /></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No goods receipts found.</p>}</CardContent></Card>
  </div>;
}
