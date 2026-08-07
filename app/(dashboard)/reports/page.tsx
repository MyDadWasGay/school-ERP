import { ReportsWorkspace } from "@/features/reports/components/reports-workspace";
import { reportQuerySchema } from "@/features/reports/schemas/report.schema";
import { getReportRows } from "@/features/reports/services/report.service";
import { requirePermission } from "@/lib/auth/guards";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = reportQuerySchema.safeParse({
    report: typeof params.report === "string" ? params.report : undefined,
    limit: typeof params.limit === "string" ? params.limit : undefined,
  });
  const query = parsed.success ? parsed.data : reportQuerySchema.parse({});
  const user = await requirePermission("reports:read");
  const result = await getReportRows(user, query);
  return <ReportsWorkspace selected={query.report} definition={result.definition} rows={result.rows} />;
}

