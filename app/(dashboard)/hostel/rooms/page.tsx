import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HostelRoomForm } from "@/features/hostel/components/hostel-workspace";
import { listHostelRooms } from "@/features/hostel/services/hostel.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function HostelRoomsPage() {
  const user = await requirePermission("hostel:read");
  const rooms = await listHostelRooms(user);
  return <div className="space-y-6"><PageHeader title="Hostel rooms" description="Set room capacity and monitor active occupancy for the selected campus scope." />{hasPermission(user, "hostel:create") ? <Card><CardHeader><CardTitle>Add room</CardTitle></CardHeader><CardContent><HostelRoomForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Room occupancy</CardTitle></CardHeader><CardContent>{rooms.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((room) => <div key={room.id} className="rounded-lg border p-4"><p className="font-medium">{room.building} / {room.roomNumber}</p><p className="text-sm text-muted-foreground">{room.floor ? `${room.floor} · ` : ""}{room.occupancy}/{room.capacity} beds occupied</p><p className="mt-2 text-sm font-medium">{room.available} available</p></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hostel rooms found.</p>}</CardContent></Card></div>;
}
