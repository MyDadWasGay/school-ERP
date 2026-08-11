import { PageHeader } from "@/components/common/page-header";
import { ReportCardsWorkspace } from "@/features/exams/components/deep-feature-workspace";
import { getDeepExamOptions, listReportCards } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ReportCardsPage() { const user = await requirePermission("exams:read"); const [options, rows] = await Promise.all([getDeepExamOptions(user), listReportCards(user)]); return <div className="space-y-6"><PageHeader title="Report cards" description="Generate reproducible report-card snapshots from approved exam marks." /><ReportCardsWorkspace exams={options.exams} students={options.students} rows={rows} canCreate={hasPermission(user, "exams:update")} /></div>; }
