import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubForm } from "@/features/community/components/community-workspace";
import { listClubs } from "@/features/community/services/community.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ActivitiesClubsPage() { const user = await requirePermission("activities:read"); const clubs = await listClubs(user); return <div className="space-y-6"><PageHeader title="Clubs" description="Manage student clubs with scoped coordinators and auditable membership-ready records." />{hasPermission(user, "activities:create") ? <Card><CardHeader><CardTitle>Create club</CardTitle></CardHeader><CardContent><ClubForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Club register</CardTitle></CardHeader><CardContent>{clubs.length ? <div className="space-y-3">{clubs.map((club) => <div key={club.id} className="flex items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{club.name}</p><p className="text-xs text-muted-foreground">{club.coordinatorUserId ? `Coordinator ${club.coordinatorUserId}` : "No coordinator assigned"}</p></div><Badge variant={club.status === "active" ? "success" : "secondary"}>{club.status}</Badge></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No clubs found.</p>}</CardContent></Card></div>; }
