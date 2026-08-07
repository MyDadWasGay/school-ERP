import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicationReviewList } from "@/features/admissions/components/application-review-list";
import { listApprovalQueue } from "@/features/admissions/services/admissions.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AdmissionApprovalsPage() {
  const user = await requirePermission("admissions:read");
  const rows = await listApprovalQueue(user);
  return <div>
    <PageHeader title="Admission approvals" description="Verify documents, reject with a reason, or atomically create the student, guardian and enrollment." />
    <Card><CardContent className="pt-6">
      <ApplicationReviewList
        rows={rows}
        canVerify={hasPermission(user, "admissions:update")}
        canApprove={hasPermission(user, "admissions:approve")}
        canReject={hasPermission(user, "admissions:reject")}
      />
    </CardContent></Card>
  </div>;
}
