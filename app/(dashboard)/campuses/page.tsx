import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { FoundationCreateForm } from "@/features/foundation/components/foundation-create-form";
import { CampusActions } from "@/features/foundation/components/campus-actions";
import { listCampuses } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function CampusesPage() {
  const user = await requirePermission("campuses:read");
  const rows = await listCampuses(user);
  return <div><PageHeader title="Campuses" description="Branches, access scope and operating configuration within your organization." /><FoundationCreateForm kind="campus" /><Card><CardContent className="pt-6"><DataTable rows={rows} columns={[
    { key: "name", header: "Campus", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "code", header: "Code", cell: (row) => row.detail },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "actions", header: "Actions", cell: (row) => <CampusActions row={row} /> },
  ]} /></CardContent></Card></div>;
}
