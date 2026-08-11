import { PageHeader } from "@/components/common/page-header";
import { FeeConfigurationWorkspace } from "@/features/finance/components/fee-configuration-workspace";
import { listFeeConfiguration } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function FeeConfigurationPage() {
  const user = await requirePermission("fees:read");
  const data = await listFeeConfiguration(user);
  return <div className="space-y-6"><PageHeader title="Fee configuration" description="Configure fee heads, versioned structures and due-date installments before generating student invoices." /><FeeConfigurationWorkspace {...data} canCreate={hasPermission(user, "fees:create")} /></div>;
}
