import Link from "next/link";
import { BookOpen, CalendarCheck, CreditCard, FileText, GraduationCap, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/common/page-header";
import type { CurrentUser } from "@/lib/auth/types";
import { listStudents } from "@/features/students/services/students.service";

const portalLinks = {
  parent: [
    ["Attendance", "/attendance/students", CalendarCheck],
    ["Homework", "/academics/assignments", BookOpen],
    ["Results", "/exams/results", FileText],
    ["Fees & receipts", "/fees/receipts", CreditCard],
    ["Notices", "/communication/notices", MessageSquare],
  ],
  student: [
    ["Timetable", "/academics/timetable", CalendarCheck],
    ["Assignments", "/academics/assignments", BookOpen],
    ["Results", "/exams/results", FileText],
    ["Activities", "/activities/clubs", GraduationCap],
    ["Notices", "/communication/notices", MessageSquare],
  ],
  teacher: [
    ["Attendance", "/attendance/students", CalendarCheck],
    ["Lesson plans", "/academics/lesson-plans", BookOpen],
    ["Marks entry", "/exams/marks", FileText],
    ["My classes", "/students", GraduationCap],
    ["Communication", "/communication/messages", MessageSquare],
  ],
} as const;

export async function PortalDashboard({ user, portal }: { user: CurrentUser; portal: keyof typeof portalLinks }) {
  const students = await listStudents(user);
  const title = portal === "parent" ? "Family dashboard" : portal === "student" ? "Student dashboard" : "Teacher dashboard";
  return <div>
    <PageHeader title={title} description={`Welcome, ${user.displayName}. Every record below is restricted to your linked identity and assigned scope.`} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{portalLinks[portal].map(([label, href, Icon]) =>
      <Link key={href} href={href}><Card className="h-full transition-colors hover:bg-muted/40"><CardHeader className="pb-2"><Icon className="h-5 w-5 text-primary" /><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Open workspace</p></CardContent></Card></Link>,
    )}</div>
    <Card className="mt-6"><CardHeader><CardTitle>{portal === "teacher" ? "Students in assigned classes" : portal === "parent" ? "Linked children" : "My student record"}</CardTitle></CardHeader><CardContent><DataTable rows={students} columns={[
      { key: "name", header: "Student", cell: (row) => <span className="font-medium">{row.name}</span> },
      { key: "detail", header: "Enrollment", cell: (row) => <span className="text-muted-foreground">{row.detail}</span> },
      { key: "status", header: "Status", cell: (row) => <span className="capitalize">{row.status}</span> },
    ]} emptyTitle="No linked student records" /></CardContent></Card>
  </div>;
}
