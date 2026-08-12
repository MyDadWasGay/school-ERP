import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listFormSubmissions } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function CmsSubmissionsPage() { const user = await requirePermission("cms:read"); const submissions = await listFormSubmissions(user); return <div className="space-y-6"><PageHeader title="Form submissions" description="Review tenant-scoped submissions linked to published forms." /><Card><CardHeader><CardTitle>Submission history</CardTitle></CardHeader><CardContent>{submissions.length ? <div className="space-y-3">{submissions.map((submission) => <div key={submission.id} className="flex items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">Form {submission.formId}</p><p className="text-xs text-muted-foreground">{submission.createdAt.toLocaleString()}</p></div><StatusBadge status={submission.status} /></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No submissions found.</p>}</CardContent></Card></div>; }
