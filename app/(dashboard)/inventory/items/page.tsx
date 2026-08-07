import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryItemForm } from "@/features/inventory/components/inventory-workspace";
import { listInventoryItems } from "@/features/inventory/services/inventory.service";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function InventoryItemsPage() {
  const user = await requirePermission("inventory:read");
  const items = await listInventoryItems(user);
  return <div className="space-y-6"><PageHeader title="Inventory items" description="Maintain item catalogues and current quantities; quantity changes are recorded through stock movements." />{hasPermission(user, "inventory:create") ? <Card><CardHeader><CardTitle>Add item</CardTitle></CardHeader><CardContent><InventoryItemForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Item catalogue</CardTitle></CardHeader><CardContent>{items.length ? <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">SKU {item.sku} · Reorder at {item.reorderLevel}</p></div><p className={item.quantity <= item.reorderLevel ? "font-semibold text-amber-700" : "font-medium"}>{item.quantity} units</p></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No inventory items found.</p>}</CardContent></Card></div>;
}

