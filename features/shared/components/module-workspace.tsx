import { permissionForPath } from "@/config/modules";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";
import { createServerApiClient } from "@/lib/api-client/server";
import type { ApiPageInfo } from "@/lib/api-client/contracts";
import { getModuleData } from "../module-data";
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
  const api = await createServerApiClient();
  const query = new URLSearchParams({ route, page: String(page) });
  if (search?.trim()) query.set("search", search.trim());
  const result = await api.call<{
    rows: Array<{ id: string; name: string; detail: string; status: string }>;
    pageInfo: ApiPageInfo;
  }>("GET", `/api/v1/catalog/records?${query.toString()}`);
  const createPermission = permissionModule === "settings" ? "settings:update" : `${permissionModule}:create`;

  return <ModuleOverview
    {...moduleData}
    title={titleForRoute(route)}
    entityLabel={entityForRoute(route)}
    rows={result.data.rows}
    pageInfo={result.data.pageInfo}
    search={search}
    route={route}
    canCreate={hasPermission(user, createPermission)}
    canUpdate={hasPermission(user, `${permissionModule}:update`)}
    canDelete={hasPermission(user, `${permissionModule}:delete`)}
  />;
}
