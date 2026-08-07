import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttendanceMarkForm } from "@/features/attendance/components/attendance-mark-form";
import {
  getAttendanceStudentOptions,
  listAttendancePage,
} from "@/features/attendance/services/attendance-workspace.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ page?: string; date?: string }> }) {
  const query = await searchParams;
  const user = await requirePermission("attendance:read");
  const [result, students] = await Promise.all([
    listAttendancePage(user, { page: Number(query.page) || 1, date: query.date }),
    getAttendanceStudentOptions(user),
  ]);
  const selectedDate = query.date ?? result.attendanceDate.toISOString().slice(0, 10);
  return <div>
    <PageHeader title="Student attendance" description="Mark current attendance directly; older changes automatically enter the correction approval workflow." />
    {hasPermission(user, "attendance:mark") ? <AttendanceMarkForm students={students} /> : null}
    <Card><CardContent className="pt-6">
      <form className="mb-4 flex max-w-sm gap-2"><Input type="date" name="date" defaultValue={selectedDate} /><Button variant="outline">View date</Button></form>
      <DataTable rows={result.rows} columns={[
        { key: "student", header: "Student", cell: (row) => <span className="font-medium">{row.student}</span> },
        { key: "state", header: "Status", cell: (row) => <StatusBadge status={row.state} /> },
        { key: "period", header: "Period", cell: (row) => row.period },
        { key: "markedAt", header: "Updated", cell: (row) => row.markedAt },
      ]} emptyTitle="No attendance has been marked for this date" />
      <ServerPagination pageInfo={result.pageInfo} pathname="/attendance/students" extraParams={{ date: selectedDate }} />
    </CardContent></Card>
  </div>;
}
