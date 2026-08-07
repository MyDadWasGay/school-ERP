import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ResultPublicationList } from "@/features/exams/components/result-publication-list";
import { listExamResults } from "@/features/exams/services/exam-workspace.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ExamResultsPage() {
  const user = await requirePermission("exams:read");
  const rows = await listExamResults(user);
  return <div>
    <PageHeader title="Exam results" description="Portal users see published results only; authorized leaders can publish approved result sets." />
    <Card><CardContent className="pt-6"><ResultPublicationList rows={rows} canPublish={hasPermission(user, "exams:publish_result")} /></CardContent></Card>
  </div>;
}
