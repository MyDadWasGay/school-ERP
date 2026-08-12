import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LibraryReservationForm } from "@/features/library/components/library-workspace";
import { listLibraryItems, listLibraryReservations } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function LibraryReservationsPage() {
  const user = await requirePermission("library:read");
  const [items, reservations] = await Promise.all([listLibraryItems(user), listLibraryReservations(user)]);
  return <div className="space-y-6"><PageHeader title="Library reservations" description="Keep one pending reservation per user and catalogue item within the tenant scope." />{hasPermission(user, "library:update") ? <Card><CardHeader><CardTitle>Reserve an item</CardTitle></CardHeader><CardContent><LibraryReservationForm items={items} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Reservation queue</CardTitle></CardHeader><CardContent>{reservations.length ? <div className="space-y-2">{reservations.map((reservation) => <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{reservation.name}</p><p className="text-xs text-muted-foreground">Requested {reservation.createdAt.toLocaleString()}</p></div><StatusBadge status={reservation.status} /></div>)}</div> : <EmptyState title="No reservations found" description="Pending reservations will appear here when a user requests an unavailable catalogue item." />}</CardContent></Card></div>;
}
