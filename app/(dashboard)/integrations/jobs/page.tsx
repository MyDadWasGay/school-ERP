import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listJobRuns } from "@/lib/jobs/job-store";
import { requirePermission } from "@/lib/auth/guards";

export default async function IntegrationJobsPage() {
  const user = await requirePermission("integrations:read");
  const jobs = await listJobRuns(user);
  return <div className="space-y-6">
    <PageHeader title="Background jobs" description="Tenant-scoped queue history, retry state, and dead-letter visibility for operator review." />
    <p className="text-sm text-muted-foreground"><Link className="underline" href="/integrations">Back to integrations</Link>. Workers call the internal job endpoint with the deployment secret; failed jobs retry with exponential backoff and never expose payloads here.</p>
    <Card><CardHeader><CardTitle>Recent jobs</CardTitle></CardHeader><CardContent><DataTable rows={jobs} columns={[
      { key: "jobType", header: "Type", cell: (row) => <span className="font-medium">{row.jobType}</span> },
      { key: "status", header: "Status", cell: (row) => <Badge variant={row.status === "succeeded" ? "success" : row.status === "dead_letter" || row.status === "failed" ? "warning" : "secondary"}>{row.status}</Badge> },
      { key: "attempts", header: "Attempts", cell: (row) => `${row.attempts}/${row.maxAttempts}` },
      { key: "createdAt", header: "Created", cell: (row) => row.createdAt },
      { key: "runAfter", header: "Next run", cell: (row) => row.status === "succeeded" ? "—" : row.runAfter },
      { key: "lastError", header: "Last error", cell: (row) => row.lastError ?? "—" },
    ]} emptyTitle="No background jobs recorded" /></CardContent></Card>
  </div>;
}
