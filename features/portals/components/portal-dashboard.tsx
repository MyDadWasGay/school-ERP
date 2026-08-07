import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import type { CurrentUser } from "@/lib/auth/types";
import { getPortalSnapshot } from "../services/portal.service";

export async function PortalDashboard({ user, portal }: { user: CurrentUser; portal: "teacher" | "student" | "parent" }) {
  const snapshot = await getPortalSnapshot(user, portal);
  const title = portal === "parent" ? "Family dashboard" : portal === "student" ? "Student dashboard" : "Teacher dashboard";
  return <div>
    <PageHeader title={title} description={`Welcome, ${user.displayName}. Data is restricted to your ${portal === "teacher" ? "assigned classes and permissions" : "linked student scope"}.`} />
    <div role="note" className="mb-6 rounded-md border border-dashed p-3 text-sm text-muted-foreground">{snapshot.offlineNote}</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{snapshot.metrics.map((metric) => <Link key={metric.href} href={metric.href}><Card className="h-full transition-colors hover:bg-muted/40"><CardHeader className="pb-2"><CardTitle className="text-sm">{metric.label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></CardContent></Card></Link>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card><CardHeader><CardTitle>{portal === "teacher" ? "Students in assigned classes" : portal === "parent" ? "Linked children" : "My student record"}</CardTitle></CardHeader><CardContent>{snapshot.students.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="px-3 py-2 font-medium">Student</th><th className="px-3 py-2 font-medium">Enrollment</th><th className="px-3 py-2 font-medium">Status</th></tr></thead><tbody>{snapshot.students.map((student) => <tr key={student.id} className="border-b last:border-0"><td className="px-3 py-2 font-medium">{student.name}</td><td className="px-3 py-2 text-muted-foreground">{student.detail}</td><td className="px-3 py-2 capitalize">{student.status}</td></tr>)}</tbody></table></div> : <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No linked or assigned student records are available.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Quick actions</CardTitle></CardHeader><CardContent><div className="space-y-3">{snapshot.recent.map((item) => <Link key={item.href} href={item.href} className="block rounded-md border p-3 transition-colors hover:bg-muted/40"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></Link>)}</div></CardContent></Card>
    </div>
  </div>;
}

