import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/common/filter-bar";
import { SearchInput } from "@/components/common/search-input";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { requirePermission } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";
import { StatusBadge } from "@/components/common/status-badge";
import { hasPermission } from "@/lib/rbac/permissions";
import Link from "next/link";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const user = await requirePermission("students:read");
  const params = await searchParams;
  const api = await createServerApiClient();
  const query = new URLSearchParams({ page: String(Number(params.page) || 1) });
  if (params.search) query.set("search", params.search);
  const resultResponse = await api.call<{
    rows: Array<{ id: string; name: string; detail: string; status: string }>;
    pageInfo: { page: number; pageSize: number; total: number; pageCount: number };
  }>("GET", `/api/v1/students?${query.toString()}`);
  const result = resultResponse.data;
  return <div>
    <PageHeader title="Students" description="The single student master powering attendance, fees, exams, portals, transport, library and certificates." action={hasPermission(user, "students:create") ? { label: "New student", href: "/students/new" } : undefined} />
    <FilterBar summary={params.search ? `Searching for “${params.search}”` : "Search by name or admission number"}>
      <form action="/students" className="flex w-full flex-wrap items-center gap-2" role="search">
        <SearchInput defaultValue={params.search} placeholder="Search by student name or admission number" />
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {params.search ? <ButtonLink href="/students" variant="ghost" size="sm">Clear</ButtonLink> : null}
      </form>
    </FilterBar>
    <Card><CardContent className="pt-6">
      <DataTable rows={result.rows} columns={[
        { key: "name", header: "Student", cell: (row) => <Link className="font-medium text-primary hover:underline" href={`/students/${row.id}`}>{row.name}</Link> },
        { key: "detail", header: "Enrollment", cell: (row) => <span className="text-muted-foreground">{row.detail}</span> },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      ]} emptyTitle={params.search ? "No students match this search" : "No students found"} emptyDescription={params.search ? "Try a different name or admission number." : "Add the first student to begin managing academic records."} emptyAction={hasPermission(user, "students:create") ? <ButtonLink href="/students/new" size="sm">New student</ButtonLink> : undefined} ariaLabel="Students" caption="Students in the current authorized scope" filtered={Boolean(params.search)} />
      <ServerPagination pageInfo={result.pageInfo} pathname="/students" search={params.search} />
    </CardContent></Card>
  </div>;
}
