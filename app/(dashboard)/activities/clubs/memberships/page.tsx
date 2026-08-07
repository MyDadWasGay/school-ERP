import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubMembershipForm } from "@/features/community/components/community-workspace";
import { listClubMemberships, listClubs } from "@/features/community/services/community.service";
import { listStudents } from "@/features/students/services/students.service";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function ClubMembershipsPage() {
  const user = await requirePermission("activities:read");
  const [clubs, students, memberships] = await Promise.all([listClubs(user), listStudents(user), listClubMemberships(user)]);
  return <div className="space-y-6"><PageHeader title="Club memberships" description="Add students to clubs only when both the club and student are in the active scope." />{hasPermission(user, "activities:create") ? <Card><CardHeader><CardTitle>Add membership</CardTitle></CardHeader><CardContent><ClubMembershipForm clubs={clubs} students={students} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Membership register</CardTitle></CardHeader><CardContent>{memberships.length ? <div className="space-y-3">{memberships.map((membership) => <div key={membership.id} className="rounded-lg border p-4"><p className="font-medium">{membership.clubName}</p><p className="text-sm text-muted-foreground">{membership.student} · {membership.status}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No memberships found.</p>}</CardContent></Card></div>;
}

