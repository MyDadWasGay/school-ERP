import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CorrectionReviewList } from "@/features/attendance/components/correction-review-list";
import { listAttendanceCorrections } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AttendanceCorrectionsPage() {
  const user = await requirePermission("attendance:read");
  const rows = await listAttendanceCorrections(user);
  return <div>
    <PageHeader title="Attendance corrections" description="Review changes requested after the direct-edit cutoff while retaining the original audit trail." />
    <Card><CardContent className="pt-6"><CorrectionReviewList rows={rows} canReview={hasPermission(user, "attendance:approve_correction")} /></CardContent></Card>
  </div>;
}
