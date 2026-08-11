import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SportsFixtureForm, SportsTeamForm } from "@/features/community/components/community-workspace";
import { listSportsFixtures, listSportsTeams } from "@/lib/api-client/server-queries";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function SportsPage() {
  const user = await requirePermission("activities:read");
  const [teams, fixtures] = await Promise.all([listSportsTeams(user), listSportsFixtures(user)]);
  return <div className="space-y-6"><PageHeader title="Sports and fixtures" description="Manage scoped teams and scheduled fixtures with tenant-safe references." />{hasPermission(user, "activities:create") ? <><Card><CardHeader><CardTitle>Create team</CardTitle></CardHeader><CardContent><SportsTeamForm /></CardContent></Card><Card><CardHeader><CardTitle>Schedule fixture</CardTitle></CardHeader><CardContent><SportsFixtureForm teams={teams} /></CardContent></Card></> : null}<Card><CardHeader><CardTitle>Teams</CardTitle></CardHeader><CardContent>{teams.length ? <div className="grid gap-3 sm:grid-cols-2">{teams.map((team) => <div key={team.id} className="rounded-lg border p-4"><p className="font-medium">{team.name}</p><p className="text-sm text-muted-foreground">{team.detailsJson ?? "Sport not specified"}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No sports teams found.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Fixtures</CardTitle></CardHeader><CardContent>{fixtures.length ? <div className="space-y-3">{fixtures.map((fixture) => <div key={fixture.id} className="rounded-lg border p-4"><p className="font-medium">{fixture.name}</p><p className="text-sm text-muted-foreground">{fixture.startsAt?.toLocaleString() ?? "No date"} · {fixture.detailsJson ?? "No fixture details"} · {fixture.status}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No fixtures found.</p>}</CardContent></Card></div>;
}
