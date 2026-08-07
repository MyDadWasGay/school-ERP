import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsMediaForm, CmsTransitionButton } from "@/features/community/components/community-workspace";
import { listCmsMedia } from "@/features/community/services/community.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function CmsMediaPage() { const user = await requirePermission("cms:read"); const media = await listCmsMedia(user); return <div className="space-y-6"><PageHeader title="CMS media" description="Register provider-backed media metadata separately from publication state." />{hasPermission(user, "cms:create") ? <Card><CardHeader><CardTitle>Register media</CardTitle></CardHeader><CardContent><CmsMediaForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Media register</CardTitle></CardHeader><CardContent>{media.length ? <div className="space-y-3">{media.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-4"><p className="font-medium">{item.name}</p><div className="flex items-center gap-3"><Badge variant={item.status === "published" ? "success" : "secondary"}>{item.status}</Badge>{hasPermission(user, "cms:publish") && item.status === "draft" ? <CmsTransitionButton kind="media" id={item.id} toStatus="published" /> : null}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No media found.</p>}</CardContent></Card></div>; }
