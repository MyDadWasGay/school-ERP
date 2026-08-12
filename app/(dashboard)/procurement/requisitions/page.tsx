import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcurementTransitionButton, RequisitionForm } from "@/features/procurement/components/procurement-workspace";
import { listRequisitions } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

const nextRequisitionStatus: Record<string, string> = { draft: "submitted", submitted: "approved", approved: "converted", rejected: "draft" };

export default async function ProcurementRequisitionsPage() {
  const user = await requirePermission("procurement:read");
  const requisitions = await listRequisitions(user);
  return <div className="space-y-6"><PageHeader title="Purchase requisitions" description="Submit, approve, reject and convert scoped purchasing requests with audited transitions." />{hasPermission(user, "procurement:create") ? <Card><CardHeader><CardTitle>New requisition</CardTitle></CardHeader><CardContent><RequisitionForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Requisition history</CardTitle></CardHeader><CardContent>{requisitions.length ? <div className="space-y-3">{requisitions.map((requisition) => <div key={requisition.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{requisition.name}</p><p className="text-xs text-muted-foreground">{requisition.code ?? requisition.id}</p></div><div className="flex items-center gap-3"><StatusBadge status={requisition.status} />{hasPermission(user, "procurement:approve") && nextRequisitionStatus[requisition.status] ? <ProcurementTransitionButton kind="requisition" id={requisition.id} toStatus={nextRequisitionStatus[requisition.status]} /> : null}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No requisitions found.</p>}</CardContent></Card></div>;
}
