import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlumniDonationForm } from "@/features/community/components/community-workspace";
import { listAlumniDonations } from "@/lib/api-client/server-queries";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function AlumniDonationsPage() {
  const user = await requirePermission("alumni:read");
  const donations = await listAlumniDonations(user);
  return <div className="space-y-6"><PageHeader title="Alumni donations" description="Record donations in a tenant-scoped register; payment settlement remains provider/reconciliation controlled." />{hasPermission(user, "alumni:create") ? <Card><CardHeader><CardTitle>Record donation</CardTitle></CardHeader><CardContent><AlumniDonationForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Donation register</CardTitle></CardHeader><CardContent>{donations.length ? <div className="space-y-3">{donations.map((donation) => <div key={donation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{donation.name}</p><p className="text-xs text-muted-foreground">{donation.detailsJson ?? "No details"}</p></div><span className="text-sm capitalize">{donation.status}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No donations found.</p>}</CardContent></Card></div>;
}
