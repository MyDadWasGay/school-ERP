import { DashboardChart } from "@/components/charts/dashboard-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { KpiCard } from "@/components/charts/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";

export default async function AnalyticsPage() {
  const user = await requirePermission("analytics:read");
  void user;
  const dashboard = (await (await createServerApiClient()).call<{
    metrics: { attendanceRate: number; collectionRate: number; students: number; openAlerts: number };
    trends: Array<{ month: string; attendance: number; collection: number }>;
  }>("GET", "/api/v1/dashboard")).data;
  const { metrics, trends } = dashboard;
  return <div>
    <PageHeader title="Analytics" description="Aggregated, permission-scoped indicators for management and operations." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Attendance" value={`${metrics.attendanceRate.toFixed(1)}%`} detail="Recorded attendance" />
      <KpiCard title="Collection" value={`${metrics.collectionRate.toFixed(1)}%`} detail="Invoiced versus outstanding" />
      <KpiCard title="Active students" value={metrics.students.toLocaleString("en-IN")} detail="Current campus" />
      <KpiCard title="Open alerts" value={metrics.openAlerts.toLocaleString("en-IN")} detail="Requires review" trend="down" />
    </div>
    <div className="mt-6"><ChartCard title="Six-month trend"><DashboardChart data={trends} /></ChartCard></div>
  </div>;
}
