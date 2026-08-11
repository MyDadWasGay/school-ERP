import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExamPlanningForm } from "@/features/exams/components/exam-planning-form";
import { ExamPlanningList } from "@/features/exams/components/exam-planning-list";
import { ExamScheduleForm } from "@/features/exams/components/exam-schedule-form";
import { getExamPlanningOptions, listExamPlanning } from "@/lib/api-client/server-queries";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function ExamPlanningPage() {
  const user = await requirePermission("exams:read");
  const [options, rows] = await Promise.all([getExamPlanningOptions(user), listExamPlanning(user)]);
  const canCreate = hasPermission(user, "exams:create");
  const canManage = hasPermission(user, "exams:update") || hasPermission(user, "exams:publish_result");
  const examOptions = rows.filter((row) => ["draft", "planning"].includes(row.status)).map((row) => ({ id: row.id, name: row.name }));
  return <div className="space-y-6">
    <PageHeader title="Exam planning" description="Create an auditable exam workflow, prevent class schedule clashes, and advance results through moderation before publication." />
    {canCreate ? <Card><CardHeader><CardTitle>Create exam</CardTitle></CardHeader><CardContent><ExamPlanningForm academicYears={options.academicYears} /></CardContent></Card> : null}
    {canManage ? <Card><CardHeader><CardTitle>Schedule subjects</CardTitle></CardHeader><CardContent><ExamScheduleForm exams={examOptions} subjects={options.subjects} classes={options.classes} /></CardContent></Card> : null}
    <Card><CardHeader><CardTitle>Exam workflow</CardTitle></CardHeader><CardContent><ExamPlanningList rows={rows} canManage={canManage} /></CardContent></Card>
  </div>;
}
