import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcurementTransitionButton, PurchaseOrderWithSupplierForm } from "@/features/procurement/components/procurement-workspace";
import { listPurchaseOrders, listRequisitions } from "@/lib/api-client/server-queries";
import { listSuppliers } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

const nextOrderStatus: Record<string, string> = { draft: "submitted", submitted: "approved", approved: "ordered", ordered: "received", partially_received: "received" };

export default async function ProcurementPurchaseOrdersPage() {
  const user = await requirePermission("procurement:read");
  const [requisitions, orders, suppliers] = await Promise.all([listRequisitions(user), listPurchaseOrders(user), listSuppliers(user)]);
  const approved = requisitions.filter((requisition) => requisition.status === "approved");
  return <div className="space-y-6"><PageHeader title="Purchase orders" description="Create orders only from approved requisitions, then move them through controlled states." />{hasPermission(user, "procurement:create") ? <Card><CardHeader><CardTitle>New purchase order</CardTitle></CardHeader><CardContent><PurchaseOrderWithSupplierForm requisitions={approved} suppliers={suppliers} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Order history</CardTitle></CardHeader><CardContent>{orders.length ? <div className="space-y-3">{orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{order.name}</p><p className="text-xs text-muted-foreground">{order.code ?? order.id}</p></div><div className="flex items-center gap-3"><Badge variant={order.status === "received" ? "success" : "secondary"}>{order.status}</Badge>{hasPermission(user, "procurement:approve") && nextOrderStatus[order.status] ? <ProcurementTransitionButton kind="order" id={order.id} toStatus={nextOrderStatus[order.status]} /> : null}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No purchase orders found.</p>}</CardContent></Card></div>;
}
