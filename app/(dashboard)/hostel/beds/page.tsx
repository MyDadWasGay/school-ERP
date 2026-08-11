import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HostelBedForm } from "@/features/hostel/components/hostel-workspace";
import { listHostelBeds, listHostelRooms } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function HostelBedsPage() {
  const user = await requirePermission("hostel:read");
  const [rooms, beds] = await Promise.all([listHostelRooms(user), listHostelBeds(user)]);
  return <div className="space-y-6"><PageHeader title="Hostel beds" description="Register beds against a room before allotting them to students." />{hasPermission(user, "hostel:create") ? <Card><CardHeader><CardTitle>Add bed</CardTitle></CardHeader><CardContent><HostelBedForm rooms={rooms} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Bed register</CardTitle></CardHeader><CardContent>{beds.length ? <div className="space-y-2">{beds.map((bed) => <div key={bed.id} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">{bed.code ?? bed.name}</p><p className="text-sm text-muted-foreground">{bed.building} / {bed.roomNumber}</p></div><span className="text-sm">{bed.status}</span></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hostel beds found.</p>}</CardContent></Card></div>;
}
