import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LeaveRequestForm,
  LeaveRequestList,
} from "@/features/attendance/components/leave-request-form";
import { listLeaveRequests } from "@/lib/api-client/server-queries";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { listStudents } from "@/lib/api-client/server-queries";

export default async function LeavePage() {
  const user = await requirePermission("attendance:read");
  const [rows, studentRows] = await Promise.all([
    listLeaveRequests(user),
    user.role === "parent" ? listStudents(user) : Promise.resolve([]),
  ]);
  const studentOptions = studentRows.map((student) => ({
    id: student.id,
    name: student.name,
  }));
  return (
    <div>
      <PageHeader
        title="Leave requests"
        description="Submit and review dated leave requests with overlap checks and an auditable approval decision."
      />
      {hasPermission(user, "attendance:request_leave") ? (
        <LeaveRequestForm students={studentOptions} />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaveRequestList rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
