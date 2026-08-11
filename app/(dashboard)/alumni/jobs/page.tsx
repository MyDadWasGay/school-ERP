import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobBoardPostForm } from "@/features/community/components/community-workspace";
import { listJobBoardPosts } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AlumniJobsPage() { const user = await requirePermission("alumni:read"); const rows = await listJobBoardPosts(user); return <div className="space-y-6"><PageHeader title="Alumni jobs" description="Maintain job-board drafts under alumni administration before publication." />{hasPermission(user, "alumni:create") ? <Card><CardHeader><CardTitle>New job post</CardTitle></CardHeader><CardContent><JobBoardPostForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Job posts</CardTitle></CardHeader><CardContent>{rows.length ? <div className="space-y-3">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border p-4"><p className="font-medium">{row.name}</p><Badge variant="secondary">{row.status}</Badge></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No job posts found.</p>}</CardContent></Card></div>; }
