import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ExportActions } from "./export-actions";
import { REPORT_DEFINITIONS, type ReportDefinition, type ReportRow } from "../services/report.service";
import type { ReportType } from "../schemas/report.schema";

function displayValue(value: ReportRow[string]) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function ReportsWorkspace({ selected, definition, rows }: { selected: ReportType; definition: ReportDefinition; rows: ReportRow[] }) {
  return <div>
    <PageHeader title="Reports" description="Bounded, permission-scoped operational reports with audited exports." />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {REPORT_DEFINITIONS.map((item) => <Link key={item.key} href={`/reports?report=${item.key}`}>
        <Card className={`h-full transition-colors hover:bg-muted/40 ${selected === item.key ? "border-primary" : ""}`}>
          <CardHeader><CardTitle className="text-base">{item.label}</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{item.description}</p></CardContent>
        </Card>
      </Link>)}
    </div>
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div><CardTitle>{definition.label}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{rows.length.toLocaleString()} rows shown from the active organization/campus scope. Reports are generated on request.</p></div>
        <ExportActions report={selected} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <EmptyState title="No records match this report" description="Try another report or review the current organization and campus scope." /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{definition.label} report</caption><thead><tr className="border-b">{definition.columns.map((column) => <th scope="col" key={column} className="px-3 py-2 font-medium capitalize">{column.replaceAll(/([A-Z])/g, " $1")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row.id ?? row.name ?? row.invoiceNumber ?? "row")}-${index}`} className="border-b last:border-0">{definition.columns.map((column) => <td key={column} className="whitespace-nowrap px-3 py-2">{displayValue(row[column])}</td>)}</tr>)}</tbody></table></div>}
      </CardContent>
    </Card>
  </div>;
}
