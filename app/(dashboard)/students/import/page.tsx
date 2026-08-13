import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentImportForm } from "@/features/import-export/components/student-import-form";
import { listStudentImportJobs } from "@/lib/api-client/server-queries";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function StudentImportPage() {
  const user = await requirePermission("students:read");
  const jobs = await listStudentImportJobs(user);
  return <div><PageHeader title="Student import" description="Upload CSV, XLSX, or XLS files, review human-readable values and row-level errors, then confirm a tenant- and campus-scoped import." />{hasPermission(user, "students:import") ? <Card className="mb-6"><CardHeader><CardTitle>Start import</CardTitle></CardHeader><CardContent><StudentImportForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Recent import jobs</CardTitle></CardHeader><CardContent><DataTable rows={jobs} columns={[{ key: "id", header: "Job", cell: (row) => <span className="font-medium">{row.id}</span> }, { key: "processedRows", header: "Processed", cell: (row) => `${row.processedRows}/${row.totalRows}` }, { key: "errorRows", header: "Errors", cell: (row) => row.errorRows }, { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> }, { key: "createdAt", header: "Created", cell: (row) => row.createdAt }, { key: "errors", header: "Error report", cell: (row) => row.errorRows > 0 ? <a className="text-primary underline" href={`/api/v1/imports/students/${row.id}/errors`}>Download</a> : "—" }]} emptyTitle="No student imports found" emptyDescription="Start an import above to see progress and row-level errors here." /></CardContent></Card></div>;
}
