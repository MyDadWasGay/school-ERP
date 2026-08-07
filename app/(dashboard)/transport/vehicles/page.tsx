import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransportVehicleForm, VehicleDocumentForm } from "@/features/transport/components/transport-workspace";
import { listTransportVehicles, listVehicleDocuments } from "@/features/transport/services/transport.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function TransportVehiclesPage() {
  const user = await requirePermission("transport:read");
  const [vehicles, documents] = await Promise.all([listTransportVehicles(user), listVehicleDocuments(user)]);
  return <div className="space-y-6"><PageHeader title="Transport vehicles" description="Register vehicles before assigning them to routes; route capacity cannot exceed vehicle capacity." />{hasPermission(user, "transport:create") ? <Card><CardHeader><CardTitle>Add vehicle</CardTitle></CardHeader><CardContent><TransportVehicleForm /></CardContent></Card> : null}{hasPermission(user, "transport:update") ? <Card><CardHeader><CardTitle>Vehicle documents</CardTitle></CardHeader><CardContent><VehicleDocumentForm vehicles={vehicles} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Fleet and compliance</CardTitle></CardHeader><CardContent>{vehicles.length ? <div className="space-y-3">{vehicles.map((vehicle) => <div key={vehicle.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{vehicle.registrationNumber}</p><p className="text-sm text-muted-foreground">{vehicle.type}</p></div><span className="text-sm">{vehicle.capacity} seats</span></div><div className="mt-2 space-y-1 text-xs text-muted-foreground">{documents.filter((document) => document.vehicleId === vehicle.id).map((document) => <p key={document.id}>{document.name} · {document.detailsJson ? (JSON.parse(document.detailsJson) as { expiresOn?: string }).expiresOn?.slice(0, 10) : "No expiry"}</p>)}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No vehicles found.</p>}</CardContent></Card></div>;
}
