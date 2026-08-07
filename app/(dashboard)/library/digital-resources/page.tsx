import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DigitalResourceForm } from "@/features/library/components/library-workspace";
import { listDigitalResources } from "@/features/library/services/library.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function LibraryDigitalResourcesPage() {
  const user = await requirePermission("library:read");
  const resources = await listDigitalResources(user);
  return <div className="space-y-6"><PageHeader title="Digital resources" description="Publish tenant-scoped library links with auditable metadata." />{hasPermission(user, "library:create") ? <Card><CardHeader><CardTitle>Add digital resource</CardTitle></CardHeader><CardContent><DigitalResourceForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Resources</CardTitle></CardHeader><CardContent>{resources.length ? <div className="space-y-2">{resources.map((resource) => { const details = resource.detailsJson ? JSON.parse(resource.detailsJson) as { url?: string; description?: string | null } : {}; return <div key={resource.id} className="rounded-md border p-3"><a className="font-medium underline" href={details.url} target="_blank" rel="noreferrer">{resource.name}</a><p className="text-sm text-muted-foreground">{details.description || details.url}</p></div>; })}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No digital resources found.</p>}</CardContent></Card></div>;
}
