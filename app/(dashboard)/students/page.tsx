import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { StudentCreateForm } from "@/features/students/components/student-create-form";
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
  const [resultResponse, formOptionsResponse] = await Promise.all([
    api.call<{
      rows: Array<{ id: string; name: string; detail: string; status: string }>;
      pageInfo: { page: number; pageSize: number; total: number; pageCount: number };
    }>("GET", `/api/v1/students?${query.toString()}`),
    api.call<{
      campuses: Array<{ id: string; name: string; code?: string; campusId?: string | null; classId?: string }>;
      academicYears: Array<{ id: string; name: string; code?: string; campusId?: string | null; classId?: string }>;
      classes: Array<{ id: string; name: string; code?: string; campusId?: string | null; classId?: string }>;
      sections: Array<{ id: string; name: string; code?: string; campusId?: string | null; classId?: string }>;
    }>("GET", "/api/v1/students/form-options"),
  ]);
  const result = resultResponse.data;
  const formOptions = formOptionsResponse.data;
  return <div>
    <PageHeader title="Students" description="The single student master powering attendance, fees, exams, portals, transport, library and certificates." />
    {hasPermission(user, "students:create") ? <StudentCreateForm options={formOptions} /> : null}
    <Card><CardContent className="pt-6">
      <DataTable rows={result.rows} columns={[
        { key: "name", header: "Student", cell: (row) => <Link className="font-medium text-primary hover:underline" href={`/students/${row.id}`}>{row.name}</Link> },
        { key: "detail", header: "Enrollment", cell: (row) => <span className="text-muted-foreground">{row.detail}</span> },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      ]} emptyTitle="No students found" />
      <ServerPagination pageInfo={result.pageInfo} pathname="/students" search={params.search} />
    </CardContent></Card>
  </div>;
}
