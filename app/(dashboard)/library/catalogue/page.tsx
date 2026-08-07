import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LibraryItemForm } from "@/features/library/components/library-workspace";
import { listLibraryItems } from "@/features/library/services/library.service";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function LibraryCataloguePage() {
  const user = await requirePermission("library:read");
  const items = await listLibraryItems(user);
  return <div className="space-y-6"><PageHeader title="Library catalogue" description="Manage tenant-scoped catalogue items and physical-copy availability." />{hasPermission(user, "library:create") ? <Card><CardHeader><CardTitle>Add catalogue item</CardTitle></CardHeader><CardContent><LibraryItemForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Catalogue</CardTitle></CardHeader><CardContent>{items.length ? <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.author || "Author not recorded"}{item.isbn ? ` · ISBN ${item.isbn}` : ""}</p></div><p className="text-sm">{item.availableCopies}/{item.totalCopies} available</p></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No catalogue items found.</p>}</CardContent></Card></div>;
}

