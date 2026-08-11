import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollRunForm, ProcessPayrollButton } from "@/features/hr/components/hr-workspace";
import { listPayrollRuns } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function PayrollRunsPage() {
  const user = await requirePermission("payroll:read");
  const runs = await listPayrollRuns(user);
  return <div className="space-y-6">
    <PageHeader title="Payroll runs" description="Create a period draft, then issue immutable payslip snapshots from active employees." />
    {hasPermission(user, "payroll:create") ? <Card><CardHeader><CardTitle>New payroll run</CardTitle></CardHeader><CardContent><PayrollRunForm /></CardContent></Card> : null}
    <Card><CardHeader><CardTitle>Run history</CardTitle></CardHeader><CardContent>
      {runs.length ? <div className="space-y-3">{runs.map((run) => <div key={run.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"><div><p className="font-medium">{run.period}</p><p className="text-sm text-muted-foreground">{run.payslipCount} payslip(s) · {run.total}</p></div><div className="flex items-center gap-3"><Badge variant={run.status === "completed" ? "success" : "secondary"}>{run.status}</Badge>{hasPermission(user, "payroll:update") && run.status !== "completed" ? <ProcessPayrollButton runId={run.id} /> : null}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No payroll runs found.</p>}
    </CardContent></Card>
  </div>;
}
