import { permissionForPath } from "@/config/modules";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";
import { getModuleData } from "../module-data";
import { listModuleRecordsPage } from "../services/module-records.service";
import { ModuleOverview } from "./module-overview";

const routeEntityNames: Record<string, string> = {
  "/library/issue-return": "circulation transaction",
  "/inventory/stock-movements": "stock movement",
  "/procurement/goods-receipts": "goods receipt",
  "/settings/access-scopes": "access scope",
  "/data-quality": "quality issue",
};

function moduleKeyForSegment(segment: string) {
  if (segment === "settings") return "foundation";
  if (["accounts", "fees", "payroll"].includes(segment)) return "finance";
  if (["reports", "alerts", "data-quality", "analytics"].includes(segment)) return "insights";
  if (["library", "transport", "hostel", "canteen", "inventory", "assets", "procurement", "communication"].includes(segment)) return "operations";
  if (["health", "safety", "facilities"].includes(segment)) return "safety";
  if (["activities", "alumni", "cms"].includes(segment)) return "community";
  return segment;
}

function titleForRoute(route: string) {
  return route
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("-", " "))
    .join(" / ");
}

function entityForRoute(route: string) {
  if (routeEntityNames[route]) return routeEntityNames[route];
  const segment = route.split("/").filter(Boolean).at(-1) ?? "record";
  const readable = segment.replaceAll("-", " ");
  return readable.endsWith("s") ? readable.slice(0, -1) : readable;
}

export async function ModuleWorkspace({
  route,
  page = 1,
  search,
}: {
  route: string;
  page?: number;
  search?: string;
}) {
  const readPermission = permissionForPath(route);
  const user = await requirePermission(readPermission);
  const permissionModule = readPermission.split(":")[0] ?? "settings";
  const segment = route.split("/").filter(Boolean)[0] ?? "workspace";
  const moduleData = getModuleData(moduleKeyForSegment(segment));
  const result = await listModuleRecordsPage(user, route, { page, search });
  const createPermission = permissionModule === "settings" ? "settings:update" : `${permissionModule}:create`;

  return <ModuleOverview
    {...moduleData}
    title={titleForRoute(route)}
    entityLabel={entityForRoute(route)}
    rows={result.rows}
    pageInfo={result.pageInfo}
    search={search}
    route={route}
    canCreate={hasPermission(user, createPermission)}
    canUpdate={hasPermission(user, `${permissionModule}:update`)}
    canDelete={hasPermission(user, `${permissionModule}:delete`)}
  />;
}
