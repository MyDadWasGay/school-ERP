import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentForm } from "@/features/finance/components/payment-form";
import { RefundForm } from "@/features/finance/components/refund-form";
import { getPaymentOptions, getRefundOptions, listPayments } from "@/features/finance/services/finance-workspace.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function FeePaymentsPage() {
  const user = await requirePermission("fees:read");
  const [payments, invoices, refundOptions] = await Promise.all([listPayments(user), getPaymentOptions(user), getRefundOptions(user)]);
  return <div>
    <PageHeader title="Fee payments" description="Post idempotent collections that atomically reduce invoice balance and create receipt and double-entry ledger records." />
    {hasPermission(user, "fees:collect") ? <PaymentForm invoices={invoices} /> : null}
    {hasPermission(user, "fees:refund") ? <RefundForm payments={refundOptions} /> : null}
    <Card><CardContent className="pt-6"><DataTable rows={payments} columns={[
      { key: "receiptNumber", header: "Receipt", cell: (row) => <span className="font-medium">{row.receiptNumber}</span> },
      { key: "amount", header: "Amount", cell: (row) => row.amount },
      { key: "method", header: "Method", cell: (row) => <span className="capitalize">{row.method}</span> },
      { key: "paidAt", header: "Paid at", cell: (row) => row.paidAt },
      { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    ]} emptyTitle="No fee payments found" /></CardContent></Card>
  </div>;
}
