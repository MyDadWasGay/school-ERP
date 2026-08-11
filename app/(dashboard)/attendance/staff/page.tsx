import { PageHeader } from "@/components/common/page-header";
import { StaffAttendanceWorkspace } from "@/features/attendance/components/attendance-extension-workspace";
import { listEmployeeOptions, listStaffAttendance } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function StaffAttendancePage() { const user = await requirePermission("attendance:read"); const [employees, rows] = await Promise.all([listEmployeeOptions(user), listStaffAttendance(user)]); return <div className="space-y-6"><PageHeader title="Staff attendance" description="Record and review employee attendance with tenant and campus scope." /><StaffAttendanceWorkspace employees={employees} rows={rows} canCreate={hasPermission(user, "attendance:mark") || hasPermission(user, "attendance:create")} /></div>; }
