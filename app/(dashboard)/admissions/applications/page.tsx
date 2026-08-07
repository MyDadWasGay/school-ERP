import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApplicationForm } from "@/features/admissions/components/application-form";
import { ApplicationActions } from "@/features/admissions/components/application-actions";
import { getAdmissionOptions, listApplicationsPage } from "@/features/admissions/services/admissions.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const query = await searchParams;
  const user = await requirePermission("admissions:read");
  const [result, options] = await Promise.all([
    listApplicationsPage(user, { page: Number(query.page) || 1, search: query.search }),
    getAdmissionOptions(user),
  ]);
  return <div>
    <PageHeader title="Admission applications" description="Create tenant-scoped applications with guardian, academic-year, class and section data." />
    {hasPermission(user, "admissions:create") ? <ApplicationForm options={options} /> : null}
    <Card><CardContent className="pt-6">
      <form className="mb-4 flex max-w-md gap-2"><Input name="search" defaultValue={query.search} placeholder="Search applicant or application number" /><Button variant="outline">Search</Button></form>
      <DataTable rows={result.rows} columns={[
        { key: "name", header: "Applicant", cell: (row) => <span className="font-medium">{row.name}</span> },
        { key: "detail", header: "Application number", cell: (row) => row.detail },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
        { key: "actions", header: "Actions", cell: (row) => hasPermission(user, "admissions:update") ? <ApplicationActions row={row} /> : null },
      ]} emptyTitle="No applications found" />
      <ServerPagination pageInfo={result.pageInfo} pathname="/admissions/applications" search={query.search} />
    </CardContent></Card>
  </div>;
}
