import { notFound } from "next/navigation";
import { EntityHeader, EntityTabs } from "@/components/common/entity-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadField } from "@/components/upload/file-upload-field";
import { RazorpayPaymentButton } from "@/features/finance/components/razorpay-payment-button";
import { CertificateIssueForm } from "@/features/students/components/certificate-issue-form";
import { EnrollmentTransferForm } from "@/features/students/components/enrollment-transfer-form";
import {
  GuardianForm,
  GuardianUnlinkButton,
  type GuardianRecord,
} from "@/features/students/components/guardian-form";
import { MedicalProfileForm } from "@/features/students/components/medical-profile-form";
import { StudentUpdateForm } from "@/features/students/components/student-update-form";
import {
  getStudentFormOptions,
  getStudentMedicalProfile,
  getStudentProfile,
} from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatIndiaDate, formatIndiaDateTime } from "@/lib/utils/india-time";

const tabs = [
  "profile",
  "guardians",
  "documents",
  "enrollment",
  "medical",
  "certificates",
  "timeline",
  "attendance",
  "fees",
  "results",
] as const;

const tabLabels: Record<(typeof tabs)[number], string> = {
  profile: "Overview",
  guardians: "Guardians",
  documents: "Documents",
  enrollment: "Enrollment",
  medical: "Medical profile",
  certificates: "Certificates",
  timeline: "Activity timeline",
  attendance: "Attendance",
  fees: "Fees & payments",
  results: "Results",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; studentTab?: string[] }>;
}) {
  const { id, studentTab } = await params;
  const user = await requirePermission("students:read");
  if (studentTab?.length && !tabs.includes(studentTab[0] as (typeof tabs)[number])) notFound();
  const profile = await getStudentProfile(user, id);
  const canUpdate = hasPermission(user, "students:update");
  const canViewSensitive = hasPermission(user, "students:view_sensitive");
  const canPayOnline = hasPermission(user, "fees:pay_online");
  const requestedTab = studentTab?.[0] ?? "profile";
  const visibleTabs = tabs.filter((tab) => {
    if (tab === "documents") return hasPermission(user, "documents:read");
    if (tab === "attendance") return hasPermission(user, "attendance:read");
    if (tab === "fees") return hasPermission(user, "fees:read");
    if (tab === "results") return hasPermission(user, "exams:read");
    return true;
  });
  const activeTab = visibleTabs.includes(requestedTab as (typeof tabs)[number])
    ? requestedTab
    : "profile";
  const [studentFormOptions, medicalProfile] = await Promise.all([
    activeTab === "enrollment" && canUpdate
      ? getStudentFormOptions(user)
      : Promise.resolve(undefined),
    activeTab === "medical" && canViewSensitive
      ? getStudentMedicalProfile(user, id)
      : Promise.resolve(null),
  ]);
  const api = ["documents", "attendance", "fees", "results"].includes(activeTab)
    ? await createServerApiClient()
    : undefined;
  const [documents, attendance, invoices, results] = await Promise.all([
    activeTab === "documents" ? api!.getStudentDocuments(id) : undefined,
    activeTab === "attendance"
      ? api!.getStudentAttendance(id, { pageSize: 50 })
      : undefined,
    activeTab === "fees"
      ? api!.getStudentInvoices(id, { pageSize: 50 })
      : undefined,
    activeTab === "results"
      ? api!.getStudentResults(id, { pageSize: 50 })
      : undefined,
  ]);
  const studentName = `${profile.student.firstName} ${profile.student.lastName}`;
  const enrollmentRows = profile.enrollments.map((enrollment) => ({
    id: enrollment.id,
    classId: enrollment.classId,
    sectionId: enrollment.sectionId,
    rollNumber: enrollment.rollNumber,
    status: enrollment.status,
  }));
  const guardianRows: GuardianRecord[] = profile.guardians.map((guardian) => ({
    ...guardian,
    address: guardian.address ?? null,
    custodyNotes: guardian.custodyNotes ?? null,
  }));
  return (
    <div>
      <EntityHeader
        name={studentName}
        identifier={`Admission ${profile.student.admissionNumber}`}
        description="One authorized master record shared across student, academic, attendance and finance workflows."
        status={profile.student.status}
        meta={<><span>{profile.student.email || "No email"}</span><span>{profile.student.phone || "No phone"}</span></>}
        backHref="/students"
      />
      <EntityTabs
        activeTab={activeTab}
        tabs={visibleTabs.map((tab) => ({ key: tab, label: tabLabels[tab], href: `/students/${id}/${tab}` }))}
      />
      {activeTab === "profile" ? (
        <div className="space-y-4">
          {canUpdate ? (
            <StudentUpdateForm
              student={{
                id: profile.student.id,
                firstName: profile.student.firstName,
                lastName: profile.student.lastName,
                gender:
                  (profile.student.gender as
                    | "female"
                    | "male"
                    | "non_binary"
                    | "prefer_not_to_say"
                    | ""
                    | undefined) ?? "",
                email: profile.student.email ?? "",
                phone: profile.student.phone ?? "",
                status: profile.student.status as
                  "active" | "inactive" | "withdrawn" | "graduated",
              }}
            />
          ) : null}
        </div>
      ) : null}
      {activeTab === "guardians" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                rows={guardianRows}
                columns={[
                  {
                    key: "name",
                    header: "Guardian",
                    cell: (row) => (
                      <span className="font-medium">
                        {row.firstName} {row.lastName}
                      </span>
                    ),
                  },
                  {
                    key: "relationship",
                    header: "Relationship",
                    cell: (row) => row.relationship === "other"
                      ? row.customRelationship || "Other"
                      : row.relationship.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
                  },
                  {
                    key: "contacts",
                    header: "Contact roles",
                    cell: (row) => [row.isPrimary ? "Primary" : null, row.isEmergencyContact ? "Emergency" : null, row.isBillingContact ? "Billing" : null].filter(Boolean).join(" · ") || "—",
                  },
                  {
                    key: "phone",
                    header: "Phone",
                    cell: (row) => row.phone ?? "-",
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    cell: (row) => canUpdate ? <div className="flex flex-wrap items-center justify-end gap-2"><GuardianForm studentId={id} guardian={row} /><GuardianUnlinkButton studentId={id} guardianId={row.id} /></div> : null,
                  },
                ]}
                emptyTitle="No guardians linked"
                emptyDescription="Add the student's parents or legal guardians. Each relationship is kept separately."
              />
            </CardContent>
          </Card>
          {canUpdate ? <GuardianForm studentId={id} /> : null}
        </div>
      ) : null}
      {activeTab === "documents" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Secure documents</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                rows={documents?.documents ?? []}
                columns={[
                  {
                    key: "category",
                    header: "Category",
                    cell: (row) => (
                      <span className="font-medium capitalize">
                        {row.category.replaceAll("_", " ")}
                      </span>
                    ),
                  },
                  {
                    key: "file",
                    header: "File",
                    cell: (row) => (
                      <a
                        className="text-primary hover:underline"
                        href={row.secureUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.originalFilename ?? "Open document"}
                      </a>
                    ),
                  },
                  {
                    key: "type",
                    header: "Type",
                    cell: (row) => row.format ?? row.resourceType,
                  },
                  {
                    key: "uploaded",
                    header: "Uploaded",
                    cell: (row) => formatIndiaDateTime(row.createdAt),
                  },
                  {
                    key: "status",
                    header: "Status",
                    cell: (row) => <StatusBadge status={row.status} />,
                  },
                ]}
                emptyTitle="No student documents"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upload a document</CardTitle>
            </CardHeader>
            <CardContent>
              {hasPermission(user, "documents:create") ? (
                <FileUploadField
                  entityType="student"
                  entityId={id}
                  category="student_document"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  campusId={user.campusId}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  You can view this student record, but your role cannot upload
                  documents.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
      {activeTab === "enrollment" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                rows={enrollmentRows}
                columns={[
                  { key: "class", header: "Class", cell: (row) => row.classId },
                  {
                    key: "section",
                    header: "Section",
                    cell: (row) => row.sectionId,
                  },
                  {
                    key: "roll",
                    header: "Roll number",
                    cell: (row) => row.rollNumber ?? "-",
                  },
                  {
                    key: "status",
                    header: "Status",
                    cell: (row) => <StatusBadge status={row.status} />,
                  },
                ]}
                emptyTitle="No enrollment history"
              />
            </CardContent>
          </Card>
          {canUpdate && studentFormOptions ? (
            <EnrollmentTransferForm
              studentId={id}
              options={studentFormOptions}
            />
          ) : null}
        </div>
      ) : null}
      {activeTab === "medical" ? (
        <Card>
          <CardContent className="pt-6">
            {canViewSensitive ? (
              <MedicalProfileForm studentId={id} profile={medicalProfile} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Medical information is restricted to authorized staff.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
      {activeTab === "certificates" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                rows={profile.certificates}
                columns={[
                  {
                    key: "number",
                    header: "Certificate",
                    cell: (row) => (
                      <span className="font-medium">
                        {row.certificateNumber}
                      </span>
                    ),
                  },
                  {
                    key: "type",
                    header: "Type",
                    cell: (row) => row.certificateType,
                  },
                  {
                    key: "issued",
                    header: "Issued",
                    cell: (row) => formatIndiaDate(row.issuedAt),
                  },
                  {
                    key: "status",
                    header: "Status",
                    cell: (row) => <StatusBadge status={row.status} />,
                  },
                ]}
                emptyTitle="No certificates issued"
              />
            </CardContent>
          </Card>
          {canUpdate ? <CertificateIssueForm studentId={id} /> : null}
        </div>
      ) : null}
      {activeTab === "timeline" ? (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              rows={profile.timeline}
              columns={[
                {
                  key: "event",
                  header: "Event",
                  cell: (row) => (
                    <span className="font-medium">{row.title}</span>
                  ),
                },
                {
                  key: "type",
                  header: "Type",
                  cell: (row) => row.eventType.replaceAll("_", " "),
                },
                {
                  key: "date",
                  header: "Occurred",
                  cell: (row) => formatIndiaDateTime(row.occurredAt),
                },
              ]}
              emptyTitle="No timeline events"
            />
          </CardContent>
        </Card>
      ) : null}
      {activeTab === "attendance" ? (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              rows={attendance?.rows ?? []}
              columns={[
                {
                  key: "date",
                  header: "Date",
                  cell: (row) =>
                    formatIndiaDate(new Date(row.attendanceDate)),
                },
                {
                  key: "period",
                  header: "Period",
                  cell: (row) => row.period.replaceAll("_", " "),
                },
                {
                  key: "state",
                  header: "Attendance",
                  cell: (row) => <StatusBadge status={row.state} />,
                },
                { key: "note", header: "Note", cell: (row) => row.note ?? "-" },
              ]}
              emptyTitle="No attendance history"
            />
          </CardContent>
        </Card>
      ) : null}
      {activeTab === "fees" ? (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              rows={invoices?.rows ?? []}
              columns={[
                {
                  key: "invoice",
                  header: "Invoice",
                  cell: (row) => (
                    <span className="font-medium">{row.invoiceNumber}</span>
                  ),
                },
                {
                  key: "issued",
                  header: "Issued",
                  cell: (row) => formatIndiaDate(row.issuedOn),
                },
                {
                  key: "due",
                  header: "Due",
                  cell: (row) => formatIndiaDate(row.dueOn),
                },
                {
                  key: "total",
                  header: "Total",
                  cell: (row) => formatMoney(row.totalMinor, row.currency),
                },
                {
                  key: "balance",
                  header: "Balance",
                  cell: (row) => formatMoney(row.balanceMinor, row.currency),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: "payment",
                  header: "Online payment",
                  cell: (row) =>
                    canPayOnline &&
                    ["open", "partial", "overdue"].includes(row.status) ? (
                      <RazorpayPaymentButton
                        invoiceId={row.id}
                        studentId={id}
                        amountMinor={row.balanceMinor}
                        currency={row.currency}
                        campusId={user.campusId ?? undefined}
                      />
                    ) : null,
                },
              ]}
              emptyTitle="No fee invoices"
            />
          </CardContent>
        </Card>
      ) : null}
      {activeTab === "results" ? (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              rows={results?.rows ?? []}
              columns={[
                {
                  key: "exam",
                  header: "Exam",
                  cell: (row) => (
                    <span className="font-medium">{row.examName}</span>
                  ),
                },
                {
                  key: "subject",
                  header: "Subject",
                  cell: (row) => row.subjectName,
                },
                {
                  key: "marks",
                  header: "Marks",
                  cell: (row) =>
                    row.marks === null
                      ? "-"
                      : `${row.marks} / ${row.maximumMarks}`,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (row) => <StatusBadge status={row.state} />,
                },
                {
                  key: "published",
                  header: "Published",
                  cell: (row) =>
                    row.publishedAt
                      ? formatIndiaDateTime(row.publishedAt)
                      : "-",
                },
              ]}
              emptyTitle="No published results"
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}
