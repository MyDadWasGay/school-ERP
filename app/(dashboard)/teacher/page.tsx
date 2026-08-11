import { PortalDashboard } from "@/features/portals/components/portal-dashboard";
import { createServerApiClient } from "@/lib/api-client/server";
export default async function TeacherPortalPage() {
  const api = await createServerApiClient();
  const [user, snapshot] = await Promise.all([
    api.getMe(),
    api.getPortalSummary("teacher"),
  ]);
  return (
    <PortalDashboard
      displayName={user.displayName}
      portal="teacher"
      snapshot={snapshot}
    />
  );
}
