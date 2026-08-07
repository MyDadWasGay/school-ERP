import { PageHeader } from "@/components/common/page-header";
import { StudentCreateForm } from "@/features/students/components/student-create-form";
import { getStudentFormOptions } from "@/features/students/services/students.service";
import { requirePermission } from "@/lib/auth/guards";

export default async function NewStudentPage() {
  const user = await requirePermission("students:create");
  const options = await getStudentFormOptions(user);
  return <div>
    <PageHeader title="Create student" description="Create the student master, initial enrollment, optional guardian link, and timeline event in one transaction." />
    <StudentCreateForm options={options} initiallyOpen />
  </div>;
}
