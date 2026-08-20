import { PortalDashboard } from "@/features/portals/components/portal-dashboard";
import { createServerApiClient } from "@/lib/api-client/server";
import type { ApiStudentProfile } from "@/lib/api-client/contracts";

export default async function StudentPortalPage() {
  const api = await createServerApiClient();
  let profile: ApiStudentProfile | null = null;
  let profileError: string | null = null;

  const [user, snapshot] = await Promise.all([
    api.getMe(),
    api.getPortalSummary("student"),
  ]);

  try {
    profile = await api.getMyStudentProfile();
  } catch (err) {
    profileError =
      err instanceof Error
        ? err.message
        : "Your account is active, but your student profile has not been linked yet. Please contact your school administrator.";
  }

  return (
    <PortalDashboard
      displayName={user.displayName}
      portal="student"
      snapshot={snapshot}
      studentProfile={profile}
      unlinkedError={profileError}
      linkedStudentId={user.linkedStudentId}
    />
  );
}
