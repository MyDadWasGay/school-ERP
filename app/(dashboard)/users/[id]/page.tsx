import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAccessWorkspace } from "@/features/users/components/user-access-workspace";
import { getUserAccessDetail } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission("users:read");
  let detail: Awaited<ReturnType<typeof getUserAccessDetail>>;
  try {
    detail = await getUserAccessDetail(actor, id);
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && error.status === 404) notFound();
    throw error;
  }
  const canManage = hasPermission(actor, "users:update");
  return <div>
    <PageHeader title={detail.user.displayName} description={`${detail.user.email} - access administration and login accountability.`} />
    <div className="mb-6 flex items-center gap-2"><StatusBadge status={detail.user.status} /><span className="text-sm capitalize text-muted-foreground">{detail.user.role.replaceAll("_", " ")}</span></div>
    <UserAccessWorkspace
      user={detail.user}
      campusOptions={detail.campusOptions}
      classSectionOptions={detail.classSectionOptions}
      assignedCampusIds={detail.campusIds}
      assignedClassScopes={detail.classSectionScopes}
      delegations={detail.delegations}
      canManage={canManage}
    />
    <Card className="mt-6">
      <CardHeader><CardTitle>Recent login audit</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {detail.loginHistory.length === 0 ? <p className="text-sm text-muted-foreground">No login events recorded.</p> : detail.loginHistory.map((login) => <div key={login.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
          <span>{login.createdAt.toLocaleString()}</span>
          <span className="text-muted-foreground">{login.ipAddress ?? "IP unavailable"}</span>
          <StatusBadge status={login.success ? "success" : "failed"} />
        </div>)}
      </CardContent>
    </Card>
  </div>;
}
