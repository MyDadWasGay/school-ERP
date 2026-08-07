import { notFound } from "next/navigation";
import { isConfiguredRoute } from "@/config/modules";
import { ModuleWorkspace } from "@/features/shared/components/module-workspace";

export default async function CatchAllModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ modulePath: string[] }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { modulePath } = await params;
  const query = await searchParams;
  const route = `/${modulePath.join("/")}`;
  if (!isConfiguredRoute(route)) notFound();
  return <ModuleWorkspace route={route} page={Number(query.page) || 1} search={query.search} />;
}
