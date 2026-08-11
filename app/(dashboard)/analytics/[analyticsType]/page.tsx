import { notFound } from "next/navigation";
import { ReportsWorkspace } from "@/features/reports/components/reports-workspace";
import type { ReportType } from "@/features/reports/schemas/report.schema";
import { requirePermission } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";

const analyticsReports: Record<string, { report: ReportType; label: string }> = {
  admissions: { report: "admissions", label: "Admissions analytics" },
  attendance: { report: "attendance", label: "Attendance analytics" },
  finance: { report: "finance", label: "Finance analytics" },
  academics: { report: "exams", label: "Academic analytics" },
  operations: { report: "inventory", label: "Operations analytics" },
};

export default async function AnalyticsDrilldownPage({ params }: { params: Promise<{ analyticsType: string }> }) {
  const { analyticsType } = await params;
  const selection = analyticsReports[analyticsType];
  if (!selection) notFound();
  await requirePermission("reports:read");
  const result = (await (await createServerApiClient()).call<{
    definition: { key: ReportType; label: string; description: string; columns: string[] };
    rows: Array<Record<string, string | number | null>>;
  }>("GET", `/api/v1/reports?report=${encodeURIComponent(selection.report)}&limit=500`)).data;
  return <div><div className="mb-4"><h1 className="text-2xl font-semibold tracking-tight">{selection.label}</h1><p className="text-sm text-muted-foreground">Scoped drill-down backed by the audited report service. Export links remain available below.</p></div><ReportsWorkspace selected={selection.report} definition={result.definition} rows={result.rows} /></div>;
}
