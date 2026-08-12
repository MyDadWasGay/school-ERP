import { notFound } from "next/navigation";
import { isConfiguredRoute } from "@/config/modules";
import { isReleasedRoute } from "@/config/route-registry";

export default async function CatchAllModulePage({
  params,
}: {
  params: Promise<{ modulePath: string[] }>;
}) {
  const { modulePath } = await params;
  const route = `/${modulePath.join("/")}`;
  if (!isConfiguredRoute(route) || !isReleasedRoute(route)) notFound();

  // Every released route must have a dedicated page. This guard prevents a
  // future route from silently becoming a generic name/note workspace.
  return notFound();
}
