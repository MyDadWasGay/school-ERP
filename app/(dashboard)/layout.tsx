import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { isUnreleasedConfiguredRoute } from "@/config/route-registry";
import { getCurrentUser } from "@/lib/auth/guards";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = headers().get("x-school-erp-pathname");
  if (pathname && isUnreleasedConfiguredRoute(pathname)) notFound();
  const user = await getCurrentUser();
  if (!user) { redirect("/login"); return null; }
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
