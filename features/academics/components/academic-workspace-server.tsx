import { PageHeader } from "@/components/common/page-header";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/auth/guards";
import type { AcademicKind } from "../schemas/academic.schema";
import { listAcademicRecords } from "../services/academic.service";
import { AcademicWorkspace } from "./academic-workspace";

const descriptions: Record<AcademicKind, string> = {
  curriculum: "Maintain curriculum versions and effective academic content.",
  "lesson-plans": "Create scheduled lesson plans with teacher, class and subject scope.",
  "teacher-allocation": "Record teacher-to-class and subject allocations for the current campus.",
  timetable: "Maintain timetable templates before publishing periods to learners.",
  substitutions: "Track planned substitutions with an auditable replacement record.",
  assignments: "Publish assignment metadata and due dates for a class and subject.",
  resources: "Register teaching resources and link them to academic context.",
};

export async function AcademicWorkspacePage({ kind }: { kind: AcademicKind }) {
  const user = await requirePermission("academics:read");
  const rows = await listAcademicRecords(user, kind);
  return <div className="space-y-6"><PageHeader title={kind.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} description={descriptions[kind]} /><AcademicWorkspace kind={kind} rows={rows} canCreate={hasPermission(user, "academics:create")} canDelete={hasPermission(user, "academics:delete")} /></div>;
}
