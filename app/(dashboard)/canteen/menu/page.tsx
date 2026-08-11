import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuForm } from "@/features/canteen/components/canteen-workspace";
import { listMenus } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function CanteenMenuPage() {
  const user = await requirePermission("canteen:read");
  const menus = await listMenus(user);
  return <div className="space-y-6"><PageHeader title="Canteen menu" description="Maintain scoped menu items and prices used by posted canteen transactions." />{hasPermission(user, "canteen:create") ? <Card><CardHeader><CardTitle>Add menu item</CardTitle></CardHeader><CardContent><MenuForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Menu</CardTitle></CardHeader><CardContent>{menus.length ? <div className="space-y-2">{menus.map((menu) => { const details = menu.detailsJson ? JSON.parse(menu.detailsJson) as { priceMinor?: number } : {}; return <div key={menu.id} className="flex items-center justify-between rounded-md border p-3"><span className="font-medium">{menu.name}</span><span className="text-sm">₹{((details.priceMinor ?? 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>; })}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No menu items found.</p>}</CardContent></Card></div>;
}
