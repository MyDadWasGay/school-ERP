import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MarksEntryForm } from "@/features/exams/components/marks-entry-form";
import { getExamWorkspaceOptions } from "@/lib/api-client/server-queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function MarksEntryPage() {
  const user = await requirePermission("exams:enter_marks");
  const options = await getExamWorkspaceOptions(user);
  return <div>
    <PageHeader title="Marks entry" description="Enter marks only for scheduled subjects and students inside your assigned class and section scope." />
    <MarksEntryForm {...options} />
    <Card><CardContent className="pt-6 text-sm text-muted-foreground">Entries are validated against exam maximum marks, enrollment, subject schedule and teacher scope before being saved for moderation.</CardContent></Card>
  </div>;
}
