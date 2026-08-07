import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlumniProfileForm } from "@/features/community/components/community-workspace";
import { listAlumniProfiles } from "@/features/community/services/community.service";
import { listStudents } from "@/features/students/services/students.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AlumniProfilesPage() { const user = await requirePermission("alumni:read"); const [profiles, students] = await Promise.all([listAlumniProfiles(user), listStudents(user)]); return <div className="space-y-6"><PageHeader title="Alumni profiles" description="Maintain privacy-aware alumni profiles with optional links to historical student records." />{hasPermission(user, "alumni:create") ? <Card><CardHeader><CardTitle>Create alumni profile</CardTitle></CardHeader><CardContent><AlumniProfileForm students={students} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Alumni directory</CardTitle></CardHeader><CardContent>{profiles.length ? <div className="space-y-3">{profiles.map((profile) => <div key={profile.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{profile.name}</p><p className="text-xs text-muted-foreground">Class of {profile.graduationYear ?? "unknown"}</p></div><Badge variant={profile.directoryVisible ? "success" : "secondary"}>{profile.directoryVisible ? "directory" : "private"}</Badge></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No alumni profiles found.</p>}</CardContent></Card></div>; }
