import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { getAdmissionSeatMatrix } from "@/features/admissions/services/admissions.service";
import { requirePermission } from "@/lib/auth/guards";

export default async function AdmissionSeatMatrixPage() {
  const user = await requirePermission("admissions:read");
  const rows = await getAdmissionSeatMatrix(user);
  return <div><PageHeader title="Admission seat matrix" description="Live capacity by campus, class and section using active enrollments." /><Card><CardContent className="pt-6"><DataTable rows={rows.map((row) => ({ ...row, id: row.sectionId }))} columns={[
    { key: "class", header: "Class", cell: (row) => row.className },
    { key: "section", header: "Section", cell: (row) => row.sectionName },
    { key: "capacity", header: "Capacity", cell: (row) => row.capacity },
    { key: "occupied", header: "Occupied", cell: (row) => row.occupied },
    { key: "available", header: "Available", cell: (row) => <span className="flex items-center gap-2">{row.available}<StatusBadge status={row.available > 0 ? "open" : "full"} /></span> },
  ]} emptyTitle="No active sections found" /></CardContent></Card></div>;
}
