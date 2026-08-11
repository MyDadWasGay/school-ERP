import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockMovementForm } from "@/features/inventory/components/inventory-workspace";
import { listInventoryItems, listStockMovements } from "@/lib/api-client/server-queries";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function StockMovementsPage() {
  const user = await requirePermission("inventory:read");
  const [items, movements] = await Promise.all([listInventoryItems(user), listStockMovements(user)]);
  return <div className="space-y-6"><PageHeader title="Stock movements" description="Post receipts, issues, and returns through an auditable transaction that updates the item balance atomically." />{hasPermission(user, "inventory:update") ? <Card><CardHeader><CardTitle>Post movement</CardTitle></CardHeader><CardContent><StockMovementForm items={items} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Movement history</CardTitle></CardHeader><CardContent>{movements.length ? <div className="space-y-2">{movements.map((movement) => <div key={movement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"><span><span className="font-medium">{movement.itemName}</span><span className="ml-2 text-muted-foreground">{movement.reference || "No reference"}</span></span><span className={movement.direction === "in" ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>{movement.direction === "in" ? "+" : "−"}{movement.quantity}</span><span className="text-muted-foreground">{movement.createdAt}</span></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No stock movements recorded.</p>}</CardContent></Card></div>;
}
