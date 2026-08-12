import dynamic from "next/dynamic";

export const LazyDashboardChart = dynamic(
  () => import("./dashboard-chart").then((module) => module.DashboardChart),
  {
    loading: () => <div className="h-72 animate-pulse rounded-lg bg-muted/60" aria-label="Loading chart" />,
  },
);
