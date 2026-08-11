import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveLibraryIssues, IssueLibraryForm } from "@/features/library/components/library-workspace";
import { listActiveLibraryIssues, listLibraryBorrowers, listLibraryCopies } from "@/lib/api-client/server-queries";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function LibraryIssueReturnPage() {
  const user = await requirePermission("library:read");
  const [copies, borrowers, issues] = await Promise.all([listLibraryCopies(user), listLibraryBorrowers(user), listActiveLibraryIssues(user)]);
  return <div className="space-y-6"><PageHeader title="Library issue and return" description="Issue, renew, return, and record lost or damaged copies with borrower limits and overdue fine calculation." />{hasPermission(user, "library:create") ? <Card><CardHeader><CardTitle>Issue a copy</CardTitle></CardHeader><CardContent><IssueLibraryForm copies={copies} borrowers={borrowers} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Active issues</CardTitle></CardHeader><CardContent><ActiveLibraryIssues issues={issues} canUpdate={hasPermission(user, "library:update")} /></CardContent></Card></div>;
}
