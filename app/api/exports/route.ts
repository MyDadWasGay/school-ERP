import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { toCsv } from "@/lib/exports/csv";
import { exportWorkbook } from "@/lib/exports/excel";
import { renderPdfReadyHtml } from "@/lib/exports/pdf";
import { AppError } from "@/lib/errors/app-error";
import { getReportRows } from "@/features/reports/services/report.service";
import { reportExportSchema } from "@/features/reports/schemas/report.schema";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const query = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = reportExportSchema.safeParse(query);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Unsupported report or export format.", 422);
    const user = await requirePermission("reports:export");
    const report = await getReportRows(user, parsed.data);
    const exportRows = report.rows;
    let body: BodyInit;
    let contentType: string;
    let extension: string;
    if (parsed.data.format === "csv") {
      body = toCsv(exportRows);
      contentType = "text/csv; charset=utf-8";
      extension = "csv";
    } else if (parsed.data.format === "xlsx") {
      const workbook = exportWorkbook(exportRows, report.definition.label);
      body = workbook.buffer.slice(workbook.byteOffset, workbook.byteOffset + workbook.byteLength) as ArrayBuffer;
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      extension = "xlsx";
    } else {
      body = renderPdfReadyHtml(report.definition.label, exportRows);
      contentType = "text/html; charset=utf-8";
      extension = "html";
    }
    await writeAuditLog(user, {
      action: "export",
      module: "reports",
      entityType: `${parsed.data.report}_report`,
      metadata: { report: parsed.data.report, format: parsed.data.format, rowCount: exportRows.length },
    });
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${parsed.data.report}-report.${extension}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("DATABASE_ERROR", "Unable to create export.", 500);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}
