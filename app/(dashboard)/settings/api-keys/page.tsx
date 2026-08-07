import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiKeyWorkspace } from "@/features/integrations/components/api-key-workspace";
import { listApiKeys } from "@/features/integrations/services/integration.service";
import { requirePermission } from "@/lib/auth/guards";

export default async function ApiKeysPage() {
  const user = await requirePermission("integrations:manage");
  const rows = await listApiKeys(user);
  return <div><PageHeader title="API keys" description="Issue scoped integration credentials. Secrets are hashed at rest and shown only once." /><Card><CardHeader><CardTitle>Manage keys</CardTitle></CardHeader><CardContent><ApiKeyWorkspace rows={rows} /></CardContent></Card></div>;
}

