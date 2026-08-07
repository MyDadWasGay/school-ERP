import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsFormForm, CmsTransitionButton } from "@/features/community/components/community-workspace";
import { listCmsForms } from "@/features/community/services/community.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function CmsFormsPage() { const user = await requirePermission("cms:read"); const forms = await listCmsForms(user); return <div className="space-y-6"><PageHeader title="CMS forms" description="Create JSON-defined form drafts and publish them only through the CMS permission boundary." />{hasPermission(user, "cms:create") ? <Card><CardHeader><CardTitle>Create form draft</CardTitle></CardHeader><CardContent><CmsFormForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Form register</CardTitle></CardHeader><CardContent>{forms.length ? <div className="space-y-3">{forms.map((form) => <div key={form.id} className="flex items-center justify-between gap-3 rounded-lg border p-4"><p className="font-medium">{form.name}</p><div className="flex items-center gap-3"><Badge variant={form.status === "published" ? "success" : "secondary"}>{form.status}</Badge>{hasPermission(user, "cms:publish") && form.status === "draft" ? <CmsTransitionButton kind="form" id={form.id} toStatus="published" /> : null}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No forms found.</p>}</CardContent></Card></div>; }
