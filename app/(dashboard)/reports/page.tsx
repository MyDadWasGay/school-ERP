import { ReportsWorkspace } from "@/features/reports/components/reports-workspace";
import { reportQuerySchema } from "@/features/reports/schemas/report.schema";
import { requirePermission } from "@/lib/auth/guards";
import { createServerApiClient } from "@/lib/api-client/server";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = reportQuerySchema.safeParse({
    report: typeof params.report === "string" ? params.report : undefined,
    limit: typeof params.limit === "string" ? params.limit : undefined,
  });
  const query = parsed.success ? parsed.data : reportQuerySchema.parse({});
  await requirePermission("reports:read");
  const result = (await (await createServerApiClient()).call<{
    definition: { key: typeof query.report; label: string; description: string; columns: string[] };
    rows: Array<Record<string, string | number | null>>;
  }>("GET", `/api/v1/reports?report=${encodeURIComponent(query.report)}&limit=${query.limit}`)).data;
  return <ReportsWorkspace selected={query.report} definition={result.definition} rows={result.rows} />;
}
