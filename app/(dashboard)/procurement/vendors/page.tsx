import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm, SupplierList } from "@/features/inventory/components/inventory-workspace";
import { listSuppliers } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ProcurementVendorsPage() {
  const user = await requirePermission("procurement:read");
  const rows = await listSuppliers(user);
  return <div className="space-y-6"><PageHeader title="Procurement vendors" description="Use one scoped vendor master for purchase-order selection and supplier contact details." />{hasPermission(user, "procurement:create") ? <Card><CardHeader><CardTitle>Add vendor</CardTitle></CardHeader><CardContent><SupplierForm mode="procurement" /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Vendor directory</CardTitle></CardHeader><CardContent><SupplierList suppliers={rows} mode="procurement" /></CardContent></Card></div>;
}
