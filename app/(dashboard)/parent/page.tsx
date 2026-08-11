import { PortalDashboard } from "@/features/portals/components/portal-dashboard";
import { createServerApiClient } from "@/lib/api-client/server";
export default async function ParentPortalPage() {
  const api = await createServerApiClient();
  const [user, snapshot] = await Promise.all([
    api.getMe(),
    api.getPortalSummary("parent"),
  ]);
  return (
    <PortalDashboard
      displayName={user.displayName}
      portal="parent"
      snapshot={snapshot}
    />
  );
}
