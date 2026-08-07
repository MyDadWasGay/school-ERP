import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisciplineForm, DisciplineList } from "@/features/attendance/components/discipline-form";
import { listDisciplineIncidents } from "@/features/attendance/services/discipline.service";
import { getAttendanceStudentOptions } from "@/features/attendance/services/attendance-workspace.service";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function DisciplinePage() {
  const user = await requirePermission("safety:read");
  const [rows, students] = await Promise.all([listDisciplineIncidents(user), getAttendanceStudentOptions(user)]);
  return <div><PageHeader title="Discipline & safety" description="Confidential incident records are tenant-scoped, permission-gated, and retained through status changes." />{hasPermission(user, "safety:create") ? <DisciplineForm students={students} /> : null}<Card><CardHeader><CardTitle>Incidents</CardTitle></CardHeader><CardContent><DisciplineList rows={rows} canUpdate={hasPermission(user, "safety:update")} /></CardContent></Card></div>;
}
