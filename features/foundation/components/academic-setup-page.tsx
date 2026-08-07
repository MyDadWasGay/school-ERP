import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";
import type { AcademicSetupKind } from "../schemas/academic-setup.schema";
import {
  getAcademicSetupOptions,
  listAcademicSetup,
} from "../services/academic-setup.service";
import { AcademicSetupWorkspace } from "./academic-setup-workspace";

export async function AcademicSetupPage({ kind }: { kind: AcademicSetupKind }) {
  const user = await requirePermission("settings:read");
  const [rows, options] = await Promise.all([
    listAcademicSetup(user, kind),
    getAcademicSetupOptions(user),
  ]);
  return <AcademicSetupWorkspace
    kind={kind}
    rows={rows}
    options={options}
    canCreate={hasPermission(user, "settings:update")}
  />;
}
