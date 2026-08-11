import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonationForm } from "@/features/finance/components/donation-workspace";
import { listDonations } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AccountingDonationsPage() {
  const user = await requirePermission("accounts:read");
  const rows = await listDonations(user);
  return <div className="space-y-6"><PageHeader title="Donations" description="Record organization-level donations in minor currency units with an auditable purpose and payment reference." />{hasPermission(user, "accounts:create") ? <Card><CardHeader><CardTitle>Record donation</CardTitle></CardHeader><CardContent><DonationForm /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Donation register</CardTitle></CardHeader><CardContent>{rows.length ? <div className="space-y-2">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{row.donorName}</p><p className="text-sm text-muted-foreground">{row.purpose}{row.paymentReference ? ` · ${row.paymentReference}` : ""}</p></div><div className="text-right"><p className="font-medium">₹{(row.amountMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">{row.receivedAt.toLocaleDateString()}</p></div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No donations recorded.</p>}</CardContent></Card></div>;
}
