import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { ServerPagination } from "@/components/data-table/server-pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InviteUserForm } from "@/features/users/components/invite-user-form";
import { listUsersPage } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const actor = await requirePermission("users:read");
  const query = await searchParams;
  const result = await listUsersPage(actor, { page: Number(query.page ?? 1), pageSize: 25, search: query.search });
  return <div>
    <PageHeader title="Users & access" description="Invite staff and assign server-enforced roles, campuses, class scopes, and temporary permissions." />
    {hasPermission(actor, "users:create") ? <InviteUserForm campuses={result.campusOptions} /> : null}
    <Card className="mt-6"><CardContent className="pt-6">
      <form className="mb-4 flex max-w-md gap-2"><Input name="search" defaultValue={query.search} placeholder="Search name or email" /><Button variant="outline">Search</Button></form>
      <DataTable rows={result.rows} columns={[
        { key: "displayName", header: "Name", cell: (row) => <Link className="font-medium text-primary hover:underline" href={`/users/${row.id}`}>{row.displayName}</Link> },
        { key: "email", header: "Email", cell: (row) => row.email },
        { key: "role", header: "Role", cell: (row) => row.role.replaceAll("_", " ") },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      ]} emptyTitle="No users found" />
      <ServerPagination pageInfo={result.pageInfo} pathname="/users" extraParams={{ search: query.search }} />
    </CardContent></Card>
  </div>;
}
