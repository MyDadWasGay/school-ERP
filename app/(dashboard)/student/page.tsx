import { PortalDashboard } from "@/features/portals/components/portal-dashboard";
import { createServerApiClient } from "@/lib/api-client/server";
export default async function StudentPortalPage() {
  const api = await createServerApiClient();
  const [user, snapshot] = await Promise.all([
    api.getMe(),
    api.getPortalSummary("student"),
  ]);
  return (
    <PortalDashboard
      displayName={user.displayName}
      portal="student"
      snapshot={snapshot}
    />
  );
}
