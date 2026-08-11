import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm, SupplierList } from "@/features/inventory/components/inventory-workspace";
import { listSuppliers } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function InventorySuppliersPage() {
  const user = await requirePermission("inventory:read");
  const rows = await listSuppliers(user);
  return <div className="space-y-6"><PageHeader title="Inventory suppliers" description="Maintain a tenant and campus-scoped supplier master used by stock and procurement workflows." />{hasPermission(user, "inventory:create") ? <Card><CardHeader><CardTitle>Add supplier</CardTitle></CardHeader><CardContent><SupplierForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Supplier directory</CardTitle></CardHeader><CardContent><SupplierList suppliers={rows} /></CardContent></Card></div>;
}
