import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteAllocationForm } from "@/features/transport/components/transport-workspace";
import { listRouteAllocations, listTransportRoutes, listTransportStops, listTransportStudents } from "@/features/transport/services/transport.service";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function TransportAllocationsPage() {
  const user = await requirePermission("transport:read");
  const [routes, stops, students, allocations] = await Promise.all([listTransportRoutes(user), listTransportStops(user), listTransportStudents(user), listRouteAllocations(user)]);
  return <div className="space-y-6"><PageHeader title="Route allocations" description="Allocate each student once and enforce route seat capacity server-side." />{hasPermission(user, "transport:update") ? <Card><CardHeader><CardTitle>Allocate student</CardTitle></CardHeader><CardContent><RouteAllocationForm routes={routes} stops={stops} students={students} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Active allocations</CardTitle></CardHeader><CardContent>{allocations.length ? <div className="space-y-2">{allocations.map((allocation) => <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"><span className="font-medium">{allocation.studentName}</span><span>{allocation.routeName} · {allocation.stopName}</span><span className="text-muted-foreground">{allocation.createdAt}</span>{hasPermission(user, "transport:export") ? <a className="underline" href={`/api/transport/manifest?routeId=${encodeURIComponent(allocation.routeId)}`}>Export manifest</a> : null}</div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No active allocations found.</p>}</CardContent></Card></div>;
}
