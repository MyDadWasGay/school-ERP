import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EnquiryForm } from "@/features/admissions/components/enquiry-form";
import { EnquiryActions } from "@/features/admissions/components/enquiry-actions";
import { getAdmissionOptions, listEnquiriesPage } from "@/features/admissions/services/admissions.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AdmissionsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const query = await searchParams;
  const user = await requirePermission("admissions:read");
  const [result, options] = await Promise.all([
    listEnquiriesPage(user, { page: Number(query.page) || 1, search: query.search }),
    getAdmissionOptions(user),
  ]);
  return <div>
    <PageHeader title="Admission enquiries" description="Capture every lead, source and follow-up before converting it into an application." />
    {hasPermission(user, "admissions:create") ? <EnquiryForm campuses={options.campuses} /> : null}
    <Card><CardContent className="pt-6">
      <form className="mb-4 flex max-w-md gap-2"><Input name="search" defaultValue={query.search} placeholder="Search applicant or guardian email" /><Button variant="outline">Search</Button></form>
      <DataTable rows={result.rows} columns={[
        { key: "name", header: "Applicant", cell: (row) => <span className="font-medium">{row.name}</span> },
        { key: "detail", header: "Source / follow-up", cell: (row) => <span className="text-muted-foreground">{row.detail}</span> },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
        { key: "actions", header: "Actions", cell: (row) => hasPermission(user, "admissions:update") ? <EnquiryActions row={row} /> : null },
      ]} emptyTitle="No enquiries found" />
      <ServerPagination pageInfo={result.pageInfo} pathname="/admissions/enquiries" search={query.search} />
    </CardContent></Card>
  </div>;
}
