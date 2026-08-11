import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IntegrationConfigForm,
  IntegrationConfigList,
  RazorpayConfigForm,
} from "@/features/integrations/components/integration-workspace";
import {
  listIntegrationConfigs,
  listIntegrationLogs,
} from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { publicEnv } from "@/lib/env-public";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function IntegrationsPage() {
  const user = await requirePermission("integrations:read");
  const [configs, logs] = await Promise.all([
    listIntegrationConfigs(user),
    listIntegrationLogs(user),
  ]);
  const canManage = hasPermission(user, "integrations:manage");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations & automation"
        description="Store provider credentials encrypted, disable integrations explicitly, and inspect tenant-scoped delivery logs without exposing secrets."
      />
      {canManage ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Razorpay payment gateway</CardTitle>
            </CardHeader>
            <CardContent>
              <RazorpayConfigForm
                organizationId={user.organizationId}
                appUrl={publicEnv.appUrl}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Configure another provider</CardTitle>
            </CardHeader>
            <CardContent>
              <IntegrationConfigForm />
            </CardContent>
          </Card>
        </>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Configured providers</CardTitle>
        </CardHeader>
        <CardContent>
          <IntegrationConfigList rows={configs} canManage={canManage} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent provider events</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <span>
                    {log.provider} · {log.eventType}
                    {log.error ? ` · ${log.error}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {log.status} · {log.createdAt}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No provider events have been recorded.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
