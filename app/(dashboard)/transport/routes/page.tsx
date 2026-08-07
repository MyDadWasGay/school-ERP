import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransportRouteForm } from "@/features/transport/components/transport-workspace";
import { listTransportRoutes } from "@/features/transport/services/transport.service";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function TransportRoutesPage() {
  const user = await requirePermission("transport:read");
  const routes = await listTransportRoutes(user);
  return <div className="space-y-6"><PageHeader title="Transport routes" description="Define route capacity and optional vehicle assignment before allocating students." />{hasPermission(user, "transport:create") ? <Card><CardHeader><CardTitle>Add route</CardTitle></CardHeader><CardContent><TransportRouteForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Routes</CardTitle></CardHeader><CardContent>{routes.length ? <div className="space-y-2">{routes.map((route) => <div key={route.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><span className="font-medium">{route.name}</span><span className="text-sm text-muted-foreground">Capacity {route.capacity}{route.vehicleId ? ` · Vehicle ${route.vehicleId}` : ""}</span></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No transport routes found.</p>}</CardContent></Card></div>;
}

