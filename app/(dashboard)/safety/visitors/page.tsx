import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisitorForm } from "@/features/safety/components/safety-workspace";
import { listVisitors } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function SafetyVisitorsPage() { const user = await requirePermission("safety:read"); const visitors = await listVisitors(user); return <div className="space-y-6"><PageHeader title="Visitor register" description="Register expected visitors with a host, purpose, and visit time before issuing access passes." />{hasPermission(user, "safety:create") ? <Card><CardHeader><CardTitle>Register visitor</CardTitle></CardHeader><CardContent><VisitorForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Visitor history</CardTitle></CardHeader><CardContent>{visitors.length ? <div className="space-y-3">{visitors.map((visitor) => <div key={visitor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{visitor.name}</p><p className="text-xs text-muted-foreground">{visitor.effectiveAt ? new Date(visitor.effectiveAt).toLocaleString() : "No visit time"}</p></div><Badge variant={visitor.status === "expected" ? "warning" : "secondary"}>{visitor.status}</Badge></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No visitors found.</p>}</CardContent></Card></div>; }
