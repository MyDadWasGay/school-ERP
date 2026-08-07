import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { StudentCreateForm } from "@/features/students/components/student-create-form";
import { getStudentFormOptions, listStudentsPage } from "@/features/students/services/students.service";
import { requirePermission } from "@/lib/auth/guards";
import { StatusBadge } from "@/components/common/status-badge";
import { hasPermission } from "@/lib/rbac/permissions";
import Link from "next/link";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const user = await requirePermission("students:read");
  const params = await searchParams;
  const [result, formOptions] = await Promise.all([
    listStudentsPage(user, { page: Number(params.page) || 1, search: params.search }),
    getStudentFormOptions(user),
  ]);
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
