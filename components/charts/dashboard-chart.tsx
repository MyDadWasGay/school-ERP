"use client";
import { AreaChart } from "@tremor/react";
export function DashboardChart({ data }: { data: Array<{ month: string; attendance: number; collection: number }> }) {
  return <AreaChart className="h-72" data={data} index="month" categories={["attendance", "collection"]} colors={["blue", "emerald"]} valueFormatter={(value) => `${value}%`} showLegend showGridLines={false} />;
}
