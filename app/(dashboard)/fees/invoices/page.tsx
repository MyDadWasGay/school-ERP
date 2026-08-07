import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceForm } from "@/features/finance/components/invoice-form";
import {
  getInvoiceStudentOptions,
  listInvoicesPage,
} from "@/features/finance/services/finance-workspace.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function FeeInvoicesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const user = await requirePermission("fees:read");
  const [result, students] = await Promise.all([
    listInvoicesPage(user, { page: Number(query.page) || 1 }),
    getInvoiceStudentOptions(user),
  ]);
  return <div>
    <PageHeader title="Fee invoices" description="Generate student-linked demands and track the immutable balance through payments and reversals." />
    {hasPermission(user, "fees:create") ? <InvoiceForm students={students} /> : null}
    <Card><CardContent className="pt-6">
      <DataTable rows={result.rows} columns={[
        { key: "student", header: "Student", cell: (row) => <span className="font-medium">{row.student}</span> },
        { key: "invoiceNumber", header: "Invoice", cell: (row) => row.invoiceNumber },
        { key: "total", header: "Total", cell: (row) => row.total },
        { key: "balance", header: "Outstanding", cell: (row) => row.balance },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      ]} emptyTitle="No fee invoices found" />
      <ServerPagination pageInfo={result.pageInfo} pathname="/fees/invoices" />
    </CardContent></Card>
  </div>;
}
