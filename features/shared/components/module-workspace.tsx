import { permissionForPath } from "@/config/modules";
import { routeLabelForPath, routePresentationForPath } from "@/config/route-registry";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/rbac/permissions";
import { createServerApiClient } from "@/lib/api-client/server";
import type { ApiPageInfo } from "@/lib/api-client/contracts";
import { getModuleData } from "../module-data";
import { ModuleOverview } from "./module-overview";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

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
  const presentation = routePresentationForPath(route);
  if (presentation === "planned") {
    return <div><PageHeader title={routeLabelForPath(route)} description={moduleData.description} /><EmptyState title="This workflow is not available yet" description="The route is reserved in the product map, but no operational workflow is released for it. Use an available workflow from the navigation." /></div>;
  }
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
    title={routeLabelForPath(route)}
    description={`${moduleData.description} This is a simple catalog workflow; financial, scheduling, and high-volume operations use dedicated pages.`}
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
