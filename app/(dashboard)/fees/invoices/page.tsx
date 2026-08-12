import { PageHeader } from "@/components/common/page-header";
import { FilterBar } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceForm } from "@/features/finance/components/invoice-form";
import {
  getInvoiceStudentOptions,
  listInvoicesPage,
} from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function FeeInvoicesPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const query = await searchParams;
  const user = await requirePermission("fees:read");
  const [result, students] = await Promise.all([
    listInvoicesPage(user, { page: Number(query.page) || 1, search: query.search }),
    getInvoiceStudentOptions(user),
  ]);
  return <div>
    <PageHeader title="Fee invoices" description="Generate student-linked demands and track the immutable balance through payments and reversals." />
    {hasPermission(user, "fees:create") ? <InvoiceForm students={students} /> : null}
    <Card><CardContent className="pt-6">
      <FilterBar summary={query.search ? `Searching for “${query.search}”` : "Search by student or invoice number"}>
        <form action="/fees/invoices" method="get" role="search" className="flex w-full max-w-md gap-2"><Input name="search" aria-label="Search invoices by student or invoice number" defaultValue={query.search} placeholder="Search student or invoice number" /><Button type="submit" variant="outline">Search</Button>{query.search ? <ButtonLink href="/fees/invoices" variant="ghost" size="sm">Clear</ButtonLink> : null}</form>
      </FilterBar>
      <DataTable rows={result.rows} columns={[
        { key: "student", header: "Student", cell: (row) => <span className="font-medium">{row.student}</span> },
        { key: "invoiceNumber", header: "Invoice", cell: (row) => row.invoiceNumber },
        { key: "total", header: "Total", cell: (row) => row.total },
        { key: "balance", header: "Outstanding", cell: (row) => row.balance },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      ]} emptyTitle={query.search ? "No fee invoices match this search" : "No fee invoices found"} emptyDescription={query.search ? "Try a different student or invoice number." : "Create an invoice to begin tracking balances."} filtered={Boolean(query.search)} ariaLabel="Fee invoices" caption="Fee invoices in the current authorized scope" />
      <ServerPagination pageInfo={result.pageInfo} pathname="/fees/invoices" search={query.search} />
    </CardContent></Card>
  </div>;
}
