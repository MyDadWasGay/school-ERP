import { PageHeader } from "@/components/common/page-header";
import { QuestionBankWorkspace } from "@/features/exams/components/deep-feature-workspace";
import { getExamWorkspaceOptions } from "@/lib/api-client/server-queries";
import { listQuestionBank } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function QuestionBankPage() { const user = await requirePermission("exams:read"); const [options, rows] = await Promise.all([getExamWorkspaceOptions(user), listQuestionBank(user)]); return <div className="space-y-6"><PageHeader title="Question bank" description="Create scoped question-bank items with subject, answer-key and marks metadata." /><QuestionBankWorkspace subjects={options.subjects} rows={rows} canCreate={hasPermission(user, "exams:create")} /></div>; }
