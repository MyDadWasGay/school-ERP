import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { requirePermission } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";

export default async function AuditLogsPage() {
  const user = await requirePermission("audit_logs:read");
  void user;
  const rows = (await (await createServerApiClient()).call<Array<{
    id: string;
    action: string;
    entity: string;
    actor: string;
    occurredAt: string;
  }>>("GET", "/api/v1/audit-logs")).data;
  return <div>
    <PageHeader title="Audit logs" description="Tenant-scoped evidence for sensitive access, mutations, exports, uploads and approvals." />
    <Card><CardContent className="pt-6"><DataTable rows={rows} columns={[
      { key: "action", header: "Action", cell: (row) => <StatusBadge status={row.action} /> },
      { key: "entity", header: "Entity", cell: (row) => <span className="font-medium">{row.entity}</span> },
      { key: "actor", header: "Actor", cell: (row) => <span className="capitalize">{row.actor}</span> },
      { key: "occurredAt", header: "Occurred", cell: (row) => <span className="text-muted-foreground">{row.occurredAt}</span> },
    ]} emptyTitle="No audit activity found" /></CardContent></Card>
  </div>;
}
