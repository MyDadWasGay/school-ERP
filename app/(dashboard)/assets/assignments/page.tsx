import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetAssignmentForm, AssetAssignmentStatusButton } from "@/features/assets/components/asset-workspace";
import { listAssetAssignments, listAssets } from "@/lib/api-client/server-queries";
import { listStudents } from "@/lib/api-client/server-queries";
import { listEmployees } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AssetAssignmentsPage() {
  const user = await requirePermission("assets:read");
  const [assets, assignments, students, employees] = await Promise.all([listAssets(user), listAssetAssignments(user), listStudents(user), listEmployees(user)]);
  const studentOptions = students.map((student) => ({ id: student.id, firstName: student.name, lastName: "", admissionNumber: student.detail.replace(/^Admission /, "") }));
  return <div className="space-y-6"><PageHeader title="Asset assignments" description="Assign an asset to one scoped student or employee at a time and record its return." />{hasPermission(user, "assets:update") ? <Card><CardHeader><CardTitle>Assign asset</CardTitle></CardHeader><CardContent><AssetAssignmentForm assets={assets} students={studentOptions} employees={employees} /></CardContent></Card> : null}<Card><CardHeader><CardTitle>Assignment history</CardTitle></CardHeader><CardContent>{assignments.length ? <div className="space-y-3">{assignments.map((assignment) => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{assignment.assetName} <span className="text-xs text-muted-foreground">{assignment.assetCode ?? ""}</span></p><p className="text-xs text-muted-foreground">{assignment.assigneeType ?? "assignee"} · {assignment.assigneeId ?? "unknown"}</p></div><div className="flex items-center gap-3"><Badge variant={assignment.status === "active" ? "success" : "secondary"}>{assignment.status}</Badge>{hasPermission(user, "assets:update") && assignment.status === "active" ? <AssetAssignmentStatusButton id={assignment.id} toStatus="returned" /> : null}</div></div>)}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No assignments found.</p>}</CardContent></Card></div>;
}
