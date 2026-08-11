import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { listInvoicesPage } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function FeeDefaultersPage() { const user = await requirePermission("fees:read"); const result = await listInvoicesPage(user, { page: 1, pageSize: 500 }); const rows = result.rows.filter((row) => row.balance !== "₹0.00"); return <div><PageHeader title="Fee defaulters" description="Invoice balances with outstanding amounts in the current campus scope." /><Card><CardContent className="pt-6"><DataTable rows={rows} columns={[{ key: "student", header: "Student", cell: (row) => row.student }, { key: "invoiceNumber", header: "Invoice", cell: (row) => row.invoiceNumber }, { key: "balance", header: "Outstanding", cell: (row) => row.balance }, { key: "status", header: "Status", cell: (row) => row.status }]} emptyTitle="No outstanding invoices found" /></CardContent></Card></div>; }
