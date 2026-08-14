import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisitorForm } from "@/features/safety/components/safety-workspace";
import { listVisitors } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatIndiaDateTime } from "@/lib/utils/india-time";

export default async function SafetyVisitorsPage() { const user = await requirePermission("safety:read"); const visitors = await listVisitors(user); return <div className="space-y-6"><PageHeader title="Visitor register" description="Register expected visitors with a host, purpose, and visit time before issuing access passes." />{hasPermission(user, "safety:create") ? <Card><CardHeader><CardTitle>Register visitor</CardTitle></CardHeader><CardContent><VisitorForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Visitor history</CardTitle></CardHeader><CardContent>{visitors.length ? <div className="space-y-3">{visitors.map((visitor) => <div key={visitor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{visitor.name}</p><p className="text-xs text-muted-foreground">{visitor.effectiveAt ? formatIndiaDateTime(visitor.effectiveAt) : "No visit time"}</p></div><StatusBadge status={visitor.status} /></div>)}</div> : <EmptyState title="No visitors found" description="Register an expected visitor above to begin the scoped visitor history." />}</CardContent></Card></div>; }
