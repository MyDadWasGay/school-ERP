import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeatMatrixOverview } from "@/features/admissions/components/seat-matrix-overview";
import { getAdmissionOptions, getAdmissionSeatMatrix } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";

type SeatMatrixSearchParams = { campusId?: string; academicYearId?: string; classId?: string; sectionId?: string };

export default async function AdmissionSeatMatrixPage({ searchParams }: { searchParams: Promise<SeatMatrixSearchParams> }) {
  const user = await requirePermission("admissions:read");
  const query = await searchParams;
  const filters = { campusId: query.campusId, academicYearId: query.academicYearId, classId: query.classId, sectionId: query.sectionId };
  const [rows, options] = await Promise.all([getAdmissionSeatMatrix(user, filters), getAdmissionOptions(user, { allAccessibleCampuses: true })]);
  return <div className="space-y-6">
    <PageHeader title="Admission seat matrix" description="See capacity, active-year enrollment and remaining seats by campus, class and section before offering admission." />
    <Card><CardHeader><CardTitle>Filter capacity view</CardTitle></CardHeader><CardContent>
      <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Campus" name="campusId" value={query.campusId}><option value="">All accessible campuses</option>{options.campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</Field>
        <Field label="Academic year" name="academicYearId" value={query.academicYearId}><option value="">All active years</option>{options.academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</Field>
        <Field label="Class" name="classId" value={query.classId}><option value="">All classes</option>{options.classes.map((classRow) => <option key={classRow.id} value={classRow.id}>{classRow.name}</option>)}</Field>
        <Field label="Section" name="sectionId" value={query.sectionId}><option value="">All sections</option>{options.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</Field>
        <div className="flex items-end gap-2"><button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Apply filters</button><Link className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent" href="/admissions/seat-matrix">Reset</Link></div>
      </form>
    </CardContent></Card>
    <SeatMatrixOverview rows={rows} />
    <Card><CardHeader><CardTitle>Detailed section view ({rows.length})</CardTitle></CardHeader><CardContent><DataTable rows={rows.map((row) => ({ ...row, id: row.sectionId }))} columns={[
      { key: "class", header: "Class", cell: (row) => row.className },
      { key: "section", header: "Section", cell: (row) => row.sectionName },
      { key: "capacity", header: "Capacity", cell: (row) => row.capacity },
      { key: "occupied", header: "Enrolled", cell: (row) => row.occupied },
      { key: "available", header: "Available", cell: (row) => <span className="flex items-center gap-2">{row.available}<StatusBadge status={row.available > 0 ? "open" : "full"} /></span> },
    ]} emptyTitle="No active sections found" emptyDescription="Try a wider campus or academic-year filter." /></CardContent></Card>
  </div>;
}

function Field({ label, name, value, children }: { label: string; name: string; value?: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-medium"><span className="block">{label}</span><select name={name} defaultValue={value ?? ""} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal">{children}</select></label>;
}
