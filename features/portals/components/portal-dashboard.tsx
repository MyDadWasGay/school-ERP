import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import type { ApiPortalSnapshot, ApiStudentProfile } from "@/lib/api-client/contracts";
import { formatIndiaDate } from "@/lib/utils/india-time";

export function PortalDashboard({
  displayName,
  portal,
  snapshot,
  studentProfile,
  unlinkedError,
  linkedStudentId,
}: {
  displayName: string;
  portal: "teacher" | "student" | "parent";
  snapshot: ApiPortalSnapshot;
  studentProfile?: ApiStudentProfile | null;
  unlinkedError?: string | null;
  linkedStudentId?: string | null;
}) {
  const title =
    portal === "parent"
      ? "Family dashboard"
      : portal === "student"
        ? "Student dashboard"
        : "Teacher dashboard";

  const primaryEnrollment = studentProfile?.enrollments?.[0];
  const primaryGuardian = studentProfile?.guardians?.find((g) => g.isPrimary) ?? studentProfile?.guardians?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`Welcome, ${displayName}. Data is restricted to your ${portal === "teacher" ? "assigned classes and permissions" : "linked student scope"}.`}
      />

      {portal === "student" && unlinkedError && !studentProfile ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <p className="font-semibold">Student Profile Not Linked</p>
          <p className="mt-1">{unlinkedError}</p>
        </div>
      ) : null}

      {portal === "student" && studentProfile?.student ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Student Master Record</CardTitle>
                <StatusBadge status={studentProfile.student.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{studentProfile.student.firstName} {studentProfile.student.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Admission Number</p>
                  <p className="font-mono font-medium">{studentProfile.student.admissionNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Class & Section</p>
                  <p className="font-medium">
                    {primaryEnrollment ? `${primaryEnrollment.className ?? "Class"} - ${primaryEnrollment.sectionName ?? "Section"}` : "No enrollment record"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Roll Number</p>
                  <p className="font-medium">{primaryEnrollment?.rollNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Campus</p>
                  <p className="font-medium">{studentProfile.campusName || "Main Campus"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{studentProfile.student.dateOfBirth ? formatIndiaDate(studentProfile.student.dateOfBirth) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{studentProfile.student.gender ? studentProfile.student.gender.replaceAll("_", " ") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blood Group</p>
                  <p className="font-medium">{studentProfile.student.bloodGroup || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contact Email</p>
                  <p className="font-medium">{studentProfile.student.email || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Guardian Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {primaryGuardian ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Guardian</p>
                    <p className="font-medium">{primaryGuardian.firstName} {primaryGuardian.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Relationship</p>
                    <p className="font-medium capitalize">{primaryGuardian.relationship.replaceAll("_", " ")}</p>
                  </div>
                  {primaryGuardian.phone ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Emergency Contact</p>
                      <p className="font-medium">{primaryGuardian.phone}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">No guardian records linked.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div
        role="note"
        className="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
      >
        {snapshot.offlineNote}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot.metrics.map((metric) => (
          <Link key={metric.href} href={metric.href}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {metric.detail}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {portal === "teacher"
                ? "Students in assigned classes"
                : portal === "parent"
                  ? "Linked children"
                  : "My student record"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.students.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Students in the current portal scope</caption>
                  <thead>
                    <tr className="border-b">
                      <th scope="col" className="px-3 py-2 font-medium">Student</th>
                      <th scope="col" className="px-3 py-2 font-medium">Enrollment</th>
                      <th scope="col" className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.students.map((student) => (
                      <tr key={student.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">
                          {student.name}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {student.detail}
                        </td>
                        <td className="px-3 py-2"><StatusBadge status={student.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No linked student records" description="Linked or assigned students will appear here when your portal scope has data." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.recent.length ? <div className="space-y-3">
              {snapshot.recent.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md border p-3 transition-colors hover:bg-muted/40"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </Link>
              ))}
            </div> : <EmptyState title="No quick actions yet" description="Relevant timetable, attendance, fees, assignments, and notice links will appear here when available." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
