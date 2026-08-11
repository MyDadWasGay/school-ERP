import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RefundForm } from "@/features/finance/components/refund-form";
import { getRefundOptions } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function FeeRefundsPage() { const user = await requirePermission("fees:read"); const options = await getRefundOptions(user); return <div><PageHeader title="Fee refunds" description="Reserve and reconcile refunds through Razorpay for online payments; ledger reversal follows provider confirmation." />{hasPermission(user, "fees:refund") ? <RefundForm payments={options} campusId={user.campusId} /> : null}<Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{options.length ? `${options.length} posted payment(s) are currently refundable in this scope.` : "No posted payment is currently refundable."}</p></CardContent></Card></div>; }
