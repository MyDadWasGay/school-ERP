import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransportStopForm } from "@/features/transport/components/transport-workspace";
import { listTransportStops } from "@/features/transport/services/transport.service";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function TransportStopsPage() {
  const user = await requirePermission("transport:read");
  const stops = await listTransportStops(user);
  return <div className="space-y-6"><PageHeader title="Transport stops" description="Maintain scoped pickup/drop points used by route allocations." />{hasPermission(user, "transport:create") ? <Card><CardHeader><CardTitle>Add stop</CardTitle></CardHeader><CardContent><TransportStopForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Stops</CardTitle></CardHeader><CardContent>{stops.length ? <div className="space-y-2">{stops.map((stop) => <div key={stop.id} className="rounded-md border p-3"><p className="font-medium">{stop.name}</p><p className="text-sm text-muted-foreground">{stop.address || "Address not recorded"}</p></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No transport stops found.</p>}</CardContent></Card></div>;
}

