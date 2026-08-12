import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { LazyDashboardChart } from "@/components/charts/lazy-dashboard-chart";
import { PageHeader } from "@/components/common/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";
import { redirect } from "next/navigation";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export default async function DashboardPage() {
  const user = await requirePermission("analytics:read");
  if (user.role === "parent") redirect("/parent");
  if (user.role === "student") redirect("/student");
  if (user.role === "teacher") redirect("/teacher");
  return <div>
    <PageHeader title="Management overview" description="A permission-scoped view of student wellbeing, academic operations and collections across the current campus." />
    <Suspense fallback={<DashboardDataLoading />}>
      <DashboardData />
    </Suspense>
  </div>;
}

async function DashboardData() {
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
  return <>
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
      <ChartCard title="Attendance and collections"><LazyDashboardChart data={trends} /></ChartCard>
      <Card><CardHeader><CardTitle>Action queue</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">No pending actions were found for your current scope.</p></CardContent></Card>
    </div>
  </>;
}

function DashboardDataLoading() {
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border bg-muted/60" />)}
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="h-96 animate-pulse rounded-xl border bg-muted/60" />
      <div className="h-96 animate-pulse rounded-xl border bg-muted/60" />
    </div>
  </>;
}
