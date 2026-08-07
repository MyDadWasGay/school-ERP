import { Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { CreateSchoolForm } from "@/features/platform/components/create-school-form";
import { SchoolActions } from "@/features/platform/components/school-actions";
import { getPlatformOverview, listPlatformSchools } from "@/features/platform/services/platform.service";

export default async function PlatformPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const query = await searchParams;
  const [overview, schools] = await Promise.all([getPlatformOverview(), listPlatformSchools(query.search)]);
  return <div className="space-y-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-300"><ShieldCheck className="h-4 w-4" />Platform operations</div><h1 className="text-3xl font-semibold tracking-tight">Command center</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Manage schools and platform health without inheriting a school tenant context.</p></div><Badge variant="outline" className="w-fit border-slate-700 text-slate-300">{overview.activeSchools} active schools</Badge></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
      ["Schools", overview.totalSchools], ["Active", overview.activeSchools], ["Suspended", overview.suspendedSchools], ["Archived", overview.archivedSchools], ["Users", overview.totalUsers], ["Teachers", overview.totalTeachers], ["Students", overview.totalStudents], ["Parents", overview.totalParents], ["Staff", overview.totalStaff],
    ].map(([label, value]) => <Card key={label as string} className="border-slate-800 bg-slate-900 text-slate-100"><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent></Card>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Card className="border-slate-800 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="text-lg">Provision a school</CardTitle><p className="text-sm text-slate-400">Creates the tenant, first campus, academic year, access defaults, and school administrator invite.</p></CardHeader><CardContent><CreateSchoolForm /></CardContent></Card>
      <Card id="schools" className="border-slate-800 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="text-lg">Schools</CardTitle><form className="mt-3 flex max-w-md gap-2"><Input name="search" defaultValue={query.search} placeholder="Search schools" className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500" /><Button type="submit" variant="outline" className="border-slate-700 text-slate-200"><Search className="mr-2 h-4 w-4" />Search</Button></form></CardHeader><CardContent><DataTable rows={schools} columns={[
        { key: "name", header: "School", cell: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-slate-500">{row.slug}</p></div> },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
        { key: "users", header: "Users", cell: (row) => row.userCount },
        { key: "created", header: "Created", cell: (row) => <span className="text-slate-400">{row.createdAt}</span> },
        { key: "actions", header: "Actions", cell: (row) => <SchoolActions organizationId={row.id} status={row.status} /> },
      ]} emptyTitle="No schools found" /></CardContent></Card>
    </div>
  </div>;
}
