import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HostelAllotmentForm, CheckoutButton } from "@/features/hostel/components/hostel-workspace";
import { listHostelAllotments, listHostelBeds, listHostelRooms, listHostelStudents } from "@/features/hostel/services/hostel.service";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function HostelAllotmentsPage() {
  const user = await requirePermission("hostel:read");
  const [rooms, beds, students, allotments] = await Promise.all([listHostelRooms(user), listHostelBeds(user), listHostelStudents(user), listHostelAllotments(user)]);
  return <div className="space-y-6"><PageHeader title="Hostel allotments" description="Allocate one active bed per student and check students out when they leave." />{hasPermission(user, "hostel:update") ? <Card><CardHeader><CardTitle>New allotment</CardTitle></CardHeader><CardContent><HostelAllotmentForm rooms={rooms} beds={beds} students={students} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Allotment history</CardTitle></CardHeader><CardContent>{allotments.length ? <div className="space-y-2">{allotments.map((allotment) => <div key={allotment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{allotment.studentName} {allotment.studentLastName}</p><p className="text-sm text-muted-foreground">{allotment.building} / {allotment.roomNumber}{allotment.bedCode ? ` / ${allotment.bedCode}` : ""} · {allotment.status}</p></div>{hasPermission(user, "hostel:update") && allotment.status === "active" ? <CheckoutButton allotmentId={allotment.id} /> : null}</div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hostel allotments found.</p>}</CardContent></Card></div>;
}
