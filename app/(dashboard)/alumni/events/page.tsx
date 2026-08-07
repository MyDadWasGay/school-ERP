import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlumniEventForm } from "@/features/community/components/community-workspace";
import { listAlumniEvents } from "@/features/community/services/community.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AlumniEventsPage() { const user = await requirePermission("alumni:read"); const events = await listAlumniEvents(user); return <div className="space-y-6"><PageHeader title="Alumni events" description="Plan alumni events with tenant-scoped dates and auditable lifecycle states." />{hasPermission(user, "alumni:create") ? <Card><CardHeader><CardTitle>Create event</CardTitle></CardHeader><CardContent><AlumniEventForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Event history</CardTitle></CardHeader><CardContent>{events.length ? <div className="space-y-3">{events.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{event.name}</p><p className="text-xs text-muted-foreground">{event.effectiveAt?.toLocaleString() ?? "No date"}</p></div><Badge variant={event.status === "published" ? "success" : "secondary"}>{event.status}</Badge></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No alumni events found.</p>}</CardContent></Card></div>; }
