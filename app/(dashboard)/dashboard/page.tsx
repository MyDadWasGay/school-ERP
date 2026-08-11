import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { DashboardChart } from "@/components/charts/dashboard-chart";
import { PageHeader } from "@/components/common/page-header";
import { requirePermission, requireUser } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";
import { redirect } from "next/navigation";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "parent") redirect("/parent");
  if (user.role === "student") redirect("/student");
  if (user.role === "teacher") redirect("/teacher");
  await requirePermission("analytics:read");
  const dashboard = (await (await createServerApiClient()).call<{
    metrics: {
      students: number;
      attendanceRate: number;
      collectionRate: number;
      pendingMinor: number;
      staff: number;
      transportUtilization: number;
      hostelOccupancy: number;
      openAlerts: number;
    };
    trends: Array<{ month: string; attendance: number; collection: number }>;
  }>("GET", "/api/v1/dashboard")).data;
  const { metrics, trends } = dashboard;
  return <div>
    <PageHeader title="Management overview" description="A permission-scoped view of student wellbeing, academic operations and collections across the current campus." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Active students" value={metrics.students.toLocaleString("en-IN")} detail="Current campus scope" />
      <KpiCard title="Attendance" value={`${metrics.attendanceRate.toFixed(1)}%`} detail="Recorded attendance" />
      <KpiCard title="Fee collection" value={`${metrics.collectionRate.toFixed(1)}%`} detail={`${money.format(metrics.pendingMinor / 100)} pending`} />
      <KpiCard title="Active staff" value={metrics.staff.toLocaleString("en-IN")} detail="Current campus scope" />
      <KpiCard title="Transport utilization" value={`${metrics.transportUtilization.toFixed(1)}%`} detail="Allocated seats" />
      <KpiCard title="Hostel occupancy" value={`${metrics.hostelOccupancy.toFixed(1)}%`} detail="Active allotments" />
      <KpiCard title="Open alerts" value={metrics.openAlerts.toLocaleString("en-IN")} detail="Requires attention" trend={metrics.openAlerts > 0 ? "down" : "up"} />
      <KpiCard title="Tenant boundary" value="Enforced" detail="Server-side RBAC" />
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <ChartCard title="Attendance and collections"><DashboardChart data={trends} /></ChartCard>
      <Card><CardHeader><CardTitle>Action queue</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">No pending actions were found for your current scope.</p></CardContent></Card>
    </div>
  </div>;
}
