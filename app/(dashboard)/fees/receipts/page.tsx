import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { listPayments } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function FeeReceiptsPage() { const user = await requirePermission("fees:read"); const rows = await listPayments(user); return <div><PageHeader title="Fee receipts" description="Review issued receipts from the scoped fee-payment ledger." /><Card><CardContent className="pt-6"><DataTable rows={rows} columns={[{ key: "receiptNumber", header: "Receipt", cell: (row) => row.receiptNumber }, { key: "amount", header: "Amount", cell: (row) => row.amount }, { key: "method", header: "Method", cell: (row) => row.method }, { key: "paidAt", header: "Paid at", cell: (row) => row.paidAt }, { key: "status", header: "Status", cell: (row) => row.status }]} emptyTitle="No receipts found" /></CardContent></Card></div>; }
