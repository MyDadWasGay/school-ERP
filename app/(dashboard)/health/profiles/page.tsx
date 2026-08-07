import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthProfileForm } from "@/features/health/components/health-workspace";
import { listHealthProfiles, listHealthStudents } from "@/features/health/services/health.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function HealthProfilesPage() {
  const user = await requirePermission("health:read");
  const [students, profiles] = await Promise.all([listHealthStudents(user), listHealthProfiles(user)]);
  return <div className="space-y-6"><PageHeader title="Health profiles" description="Sensitive allergies and conditions are scoped to the health permission and current campus." />{hasPermission(user, "health:update") ? <Card><CardHeader><CardTitle>Save profile</CardTitle></CardHeader><CardContent><HealthProfileForm students={students} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Profiles</CardTitle></CardHeader><CardContent>{profiles.length ? <div className="space-y-3">{profiles.map((profile) => <div key={profile.id} className="rounded-lg border p-4"><p className="font-medium">{profile.studentName}</p><p className="mt-1 text-sm"><span className="font-medium">Allergies:</span> {profile.allergies || "None recorded"}</p><p className="text-sm"><span className="font-medium">Conditions:</span> {profile.conditions || "None recorded"}</p></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No health profiles found.</p>}</CardContent></Card></div>;
}
