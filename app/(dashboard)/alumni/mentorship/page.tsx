import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MentorshipForm } from "@/features/community/components/community-workspace";
import { listMentorships } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AlumniMentorshipPage() { const user = await requirePermission("alumni:read"); const rows = await listMentorships(user); return <div className="space-y-6"><PageHeader title="Alumni mentorship" description="Record mentorship requests with explicit participants and a tenant-scoped status trail." />{hasPermission(user, "alumni:create") ? <Card><CardHeader><CardTitle>New mentorship request</CardTitle></CardHeader><CardContent><MentorshipForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Mentorship requests</CardTitle></CardHeader><CardContent>{rows.length ? <div className="space-y-3">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border p-4"><p className="font-medium">{row.name}</p><StatusBadge status={row.status} /></div>)}</div> : <EmptyState title="No mentorship requests" description="New mentorship requests will appear here when alumni or students submit them." />}</CardContent></Card></div>; }
