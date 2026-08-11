import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementForm } from "@/features/community/components/community-workspace";
import { listAchievements } from "@/lib/api-client/server-queries";
import { listStudents } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function ActivitiesAchievementsPage() { const user = await requirePermission("activities:read"); const [achievements, students] = await Promise.all([listAchievements(user), listStudents(user)]); return <div className="space-y-6"><PageHeader title="Student achievements" description="Record achievements against authorized students so they can be reused in student timelines and reports." />{hasPermission(user, "activities:create") ? <Card><CardHeader><CardTitle>Record achievement</CardTitle></CardHeader><CardContent><AchievementForm students={students} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Achievement history</CardTitle></CardHeader><CardContent>{achievements.length ? <div className="space-y-3">{achievements.map((achievement) => <div key={achievement.id} className="rounded-lg border p-4"><p className="font-medium">{achievement.title}</p><p className="text-xs text-muted-foreground">{achievement.studentName} · {achievement.achievedOn.toLocaleDateString()}</p></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No achievements found.</p>}</CardContent></Card></div>; }
