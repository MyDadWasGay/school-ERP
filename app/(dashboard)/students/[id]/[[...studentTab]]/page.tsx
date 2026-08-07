import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadField } from "@/components/upload/file-upload-field";
import { CertificateIssueForm } from "@/features/students/components/certificate-issue-form";
import { EnrollmentTransferForm } from "@/features/students/components/enrollment-transfer-form";
import { GuardianForm, GuardianUnlinkButton } from "@/features/students/components/guardian-form";
import { MedicalProfileForm } from "@/features/students/components/medical-profile-form";
import { StudentUpdateForm } from "@/features/students/components/student-update-form";
import { getStudentFormOptions, getStudentMedicalProfile, getStudentProfile } from "@/features/students/services/students.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { hasPermission } from "@/lib/rbac/permissions";

const tabs = ["profile", "guardians", "documents", "enrollment", "medical", "certificates", "timeline", "attendance", "fees", "results"] as const;

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; studentTab?: string[] }>;
}) {
  const { id, studentTab } = await params;
  const user = await requirePermission("students:read");
  const profile = await getStudentProfile(user, id);
  const canUpdate = hasPermission(user, "students:update");
  const canViewSensitive = hasPermission(user, "students:view_sensitive");
  const [studentFormOptions, medicalProfile] = await Promise.all([
    canUpdate ? getStudentFormOptions(user) : Promise.resolve(undefined),
    canViewSensitive ? getStudentMedicalProfile(user, id) : Promise.resolve(null),
  ]);
  if (canViewSensitive) {
    await writeAuditLog(user, { action: "view_sensitive", module: "students", entityType: "student_medical_profile", entityId: id, campusId: profile.student.campusId, metadata: { fields: "restricted_health_summary" } });
  }
  const activeTab = tabs.includes((studentTab?.[0] ?? "profile") as (typeof tabs)[number])
    ? studentTab?.[0] ?? "profile"
    : "profile";
  const studentName = `${profile.student.firstName} ${profile.student.lastName}`;
  const enrollmentRows = profile.enrollments.map((enrollment) => ({
    id: enrollment.id,
    classId: enrollment.classId,
    sectionId: enrollment.sectionId,
    rollNumber: enrollment.rollNumber,
    status: enrollment.status,
  }));
  return <div>
    <PageHeader title={studentName} description={`Admission ${profile.student.admissionNumber} - one master record shared across every module.`} />
    <nav aria-label="Student sections" className="mb-6 flex gap-2 overflow-x-auto pb-1">{tabs.map((tab) =>
      <Link key={tab} href={`/students/${id}/${tab}`} className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm capitalize ${activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{tab}</Link>,
    )}</nav>
    {activeTab === "profile" ? <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6"><div><p className="font-medium">{studentName}</p><p className="text-sm text-muted-foreground">{profile.student.email || "No email"} - {profile.student.phone || "No phone"}</p></div><StatusBadge status={profile.student.status} /></CardContent></Card>
      {canUpdate ? <StudentUpdateForm student={{
        id: profile.student.id,
        firstName: profile.student.firstName,
        lastName: profile.student.lastName,
        gender: (profile.student.gender as "female" | "male" | "non_binary" | "prefer_not_to_say" | "" | undefined) ?? "",
        email: profile.student.email ?? "",
        phone: profile.student.phone ?? "",
        status: profile.student.status as "active" | "inactive" | "withdrawn" | "graduated",
      }} /> : null}
    </div> : null}
    {activeTab === "guardians" ? <div className="space-y-4"><Card><CardContent className="pt-6"><DataTable rows={profile.guardians} columns={[
      { key: "name", header: "Guardian", cell: (row) => <span className="font-medium">{row.firstName} {row.lastName}</span> },
      { key: "relationship", header: "Relationship", cell: (row) => row.relationship },
      { key: "primary", header: "Primary", cell: (row) => row.isPrimary ? "Yes" : "No" },
      { key: "phone", header: "Phone", cell: (row) => row.phone ?? "-" },
      { key: "actions", header: "Actions", cell: (row) => canUpdate ? <GuardianUnlinkButton studentId={id} guardianId={row.id} /> : null },
    ]} emptyTitle="No guardians linked" /></CardContent></Card>{canUpdate ? <GuardianForm studentId={id} /> : null}</div> : null}
    {activeTab === "documents" ? <Card><CardHeader><CardTitle>Secure documents</CardTitle></CardHeader><CardContent>
      {hasPermission(user, "documents:create")
        ? <FileUploadField entityType="student" entityId={id} category="student_document" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" />
        : <p className="text-sm text-muted-foreground">You can view this student record, but your role cannot upload documents.</p>}
    </CardContent></Card> : null}
    {activeTab === "enrollment" ? <div className="space-y-4"><Card><CardContent className="pt-6"><DataTable rows={enrollmentRows} columns={[
      { key: "class", header: "Class", cell: (row) => row.classId },
      { key: "section", header: "Section", cell: (row) => row.sectionId },
      { key: "roll", header: "Roll number", cell: (row) => row.rollNumber ?? "-" },
      { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    ]} emptyTitle="No enrollment history" /></CardContent></Card>{canUpdate && studentFormOptions ? <EnrollmentTransferForm studentId={id} options={studentFormOptions} /> : null}</div> : null}
    {activeTab === "medical" ? <Card><CardContent className="pt-6">{canViewSensitive ? <MedicalProfileForm studentId={id} profile={medicalProfile} /> : <p className="text-sm text-muted-foreground">Medical information is restricted to authorized staff.</p>}</CardContent></Card> : null}
    {activeTab === "certificates" ? <div className="space-y-4"><Card><CardContent className="pt-6"><DataTable rows={profile.certificates} columns={[
      { key: "number", header: "Certificate", cell: (row) => <span className="font-medium">{row.certificateNumber}</span> },
      { key: "type", header: "Type", cell: (row) => row.certificateType },
      { key: "issued", header: "Issued", cell: (row) => row.issuedAt.toLocaleDateString() },
      { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    ]} emptyTitle="No certificates issued" /></CardContent></Card>{canUpdate ? <CertificateIssueForm studentId={id} /> : null}</div> : null}
    {activeTab === "timeline" ? <Card><CardContent className="pt-6"><DataTable rows={profile.timeline} columns={[
      { key: "event", header: "Event", cell: (row) => <span className="font-medium">{row.title}</span> },
      { key: "type", header: "Type", cell: (row) => row.eventType.replaceAll("_", " ") },
      { key: "date", header: "Occurred", cell: (row) => row.occurredAt.toLocaleString() },
    ]} emptyTitle="No timeline events" /></CardContent></Card> : null}
    {activeTab === "attendance" ? <LinkedWorkspace href="/attendance/students" label="Open scoped attendance history" /> : null}
    {activeTab === "fees" ? <LinkedWorkspace href="/fees/invoices" label="Open scoped fee invoices" /> : null}
    {activeTab === "results" ? <LinkedWorkspace href="/exams/results" label="Open published exam results" /> : null}
  </div>;
}

function LinkedWorkspace({ href, label }: { href: string; label: string }) {
  return <Card><CardContent className="pt-6"><Link className="text-sm font-medium text-primary hover:underline" href={href}>{label}</Link></CardContent></Card>;
}
