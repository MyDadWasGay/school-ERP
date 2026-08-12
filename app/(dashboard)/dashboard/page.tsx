import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { LazyDashboardChart } from "@/components/charts/lazy-dashboard-chart";
import { PageHeader } from "@/components/common/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac/permissions";
import type { CurrentUser } from "@/lib/auth/types";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export default async function DashboardPage() {
  const user = await requirePermission("analytics:read");
  if (user.role === "parent") redirect("/parent");
  if (user.role === "student") redirect("/student");
  if (user.role === "teacher") redirect("/teacher");
  return <div>
    <PageHeader title="Management overview" description="A permission-scoped view of student wellbeing, academic operations and collections across the current campus." />
    <Suspense fallback={<DashboardDataLoading />}>
      <DashboardData user={user} />
    </Suspense>
  </div>;
}

async function DashboardData({ user }: { user: CurrentUser }) {
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
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <ChartCard title="Attendance and collections"><LazyDashboardChart data={trends} /></ChartCard>
      <ActionQueue metrics={metrics} user={user} />
    </div>
  </>;
}

function ActionQueue({ metrics, user }: { metrics: { attendanceRate: number; pendingMinor: number; openAlerts: number }; user: CurrentUser }) {
  const actions = [
    metrics.openAlerts > 0 && hasPermission(user, "reports:read") ? { href: "/alerts", title: `${metrics.openAlerts.toLocaleString("en-IN")} open alert${metrics.openAlerts === 1 ? "" : "s"}`, detail: "Review campus alerts and follow-up owners." } : null,
    metrics.pendingMinor > 0 && hasPermission(user, "fees:read") ? { href: "/fees/defaulters", title: "Review outstanding fees", detail: `${money.format(metrics.pendingMinor / 100)} remains outstanding in this scope.` } : null,
    metrics.attendanceRate < 90 && hasPermission(user, "attendance:read") ? { href: "/attendance/students", title: "Review attendance", detail: `Recorded attendance is ${metrics.attendanceRate.toFixed(1)}%.` } : null,
  ].filter((action): action is { href: string; title: string; detail: string } => Boolean(action));
  return <Card><CardHeader><CardTitle>Action queue</CardTitle></CardHeader><CardContent>{actions.length ? <div className="space-y-3">{actions.map((action) => <Link key={action.href} href={action.href} className="block rounded-md border p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="font-medium">{action.title}</p><p className="mt-1 text-xs text-muted-foreground">{action.detail}</p></Link>)}</div> : <div className="space-y-3"><p className="text-sm text-muted-foreground">No urgent actions are reported for this campus scope.</p><div className="flex flex-wrap gap-2">{hasPermission(user, "students:read") ? <Link className="text-sm font-medium text-primary hover:underline" href="/students">Review students</Link> : null}{hasPermission(user, "reports:read") ? <Link className="text-sm font-medium text-primary hover:underline" href="/reports">Open reports</Link> : null}</div></div>}</CardContent></Card>;
}

function DashboardDataLoading() {
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 7 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border bg-muted/60" />)}
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="h-96 animate-pulse rounded-xl border bg-muted/60" />
      <div className="h-96 animate-pulse rounded-xl border bg-muted/60" />
    </div>
  </>;
}
