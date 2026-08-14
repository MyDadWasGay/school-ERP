import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClinicVisitForm } from "@/features/health/components/health-workspace";
import { listClinicVisits, listHealthStudents } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatIndiaDateTime } from "@/lib/utils/india-time";

export default async function ClinicVisitsPage() {
  const user = await requirePermission("health:read");
  const [students, visits] = await Promise.all([listHealthStudents(user), listClinicVisits(user)]);
  return <div className="space-y-6"><PageHeader title="Clinic visits" description="Record student visits without exposing health records to unrelated module permissions." />{hasPermission(user, "health:update") ? <Card><CardHeader><CardTitle>Record visit</CardTitle></CardHeader><CardContent><ClinicVisitForm students={students} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Visit history</CardTitle></CardHeader><CardContent>{visits.length ? <div className="space-y-2">{visits.map((visit) => <div key={visit.id} className="rounded-md border p-3"><p className="font-medium">{visit.studentName}</p><p className="text-xs text-muted-foreground">{formatIndiaDateTime(visit.visitedAt)}</p><p className="mt-1 text-sm">{visit.summary}</p></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No clinic visits found.</p>}</CardContent></Card></div>;
}
