import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaveRequestForm, LeaveRequestList } from "@/features/attendance/components/leave-request-form";
import { listLeaveRequests } from "@/features/attendance/services/leave.service";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function LeavePage() {
  const user = await requirePermission("attendance:read");
  const rows = await listLeaveRequests(user);
  return <div><PageHeader title="Leave requests" description="Submit and review dated leave requests with overlap checks and an auditable approval decision." />{hasPermission(user, "attendance:request_leave") ? <LeaveRequestForm /> : null}<Card><CardHeader><CardTitle>Requests</CardTitle></CardHeader><CardContent><LeaveRequestList rows={rows} /></CardContent></Card></div>;
}
