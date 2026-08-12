import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvacuationCloseButton, EvacuationForm } from "@/features/safety/components/safety-workspace";
import { listEvacuations } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function SafetyEvacuationPage() { const user = await requirePermission("safety:read"); const rollCalls = await listEvacuations(user); return <div className="space-y-6"><PageHeader title="Evacuation roll calls" description="Open and close auditable evacuation exercises or incident roll calls for the selected campus." />{hasPermission(user, "safety:create") ? <Card><CardHeader><CardTitle>Open roll call</CardTitle></CardHeader><CardContent><EvacuationForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Roll-call history</CardTitle></CardHeader><CardContent>{rollCalls.length ? <div className="space-y-3">{rollCalls.map((rollCall) => <div key={rollCall.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{rollCall.name}</p><p className="text-xs text-muted-foreground">{rollCall.effectiveAt ? new Date(rollCall.effectiveAt).toLocaleString() : "unknown"}</p></div><div className="flex items-center gap-3"><StatusBadge status={rollCall.status} />{hasPermission(user, "safety:update") && rollCall.status === "open" ? <EvacuationCloseButton id={rollCall.id} /> : null}</div></div>)}</div> : <EmptyState title="No roll calls found" description="Open a roll call above to begin an auditable evacuation exercise." />}</CardContent></Card></div>; }
