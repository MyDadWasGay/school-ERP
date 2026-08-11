import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LibraryCopyForm } from "@/features/library/components/library-workspace";
import { listLibraryCopies, listLibraryItems } from "@/lib/api-client/server-queries";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function LibraryCopiesPage() {
  const user = await requirePermission("library:read");
  const [items, copies] = await Promise.all([listLibraryItems(user), listLibraryCopies(user, undefined, false)]);
  return <div className="space-y-6"><PageHeader title="Library copies" description="Every physical copy has a unique accession number and an auditable availability state." />{hasPermission(user, "library:create") ? <Card><CardHeader><CardTitle>Add physical copy</CardTitle></CardHeader><CardContent><LibraryCopyForm items={items} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Copies</CardTitle></CardHeader><CardContent>{copies.length ? <div className="space-y-2">{copies.map((copy) => <div key={copy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><span><span className="font-medium">{copy.title}</span><span className="ml-2 text-sm text-muted-foreground">{copy.accessionNumber}</span></span><span className="text-sm capitalize text-muted-foreground">{copy.status}</span></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No physical copies found.</p>}</CardContent></Card></div>;
}
