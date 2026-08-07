import { NextResponse } from "next/server";
import { getStudentImportErrors } from "@/features/import-export/services/student-import.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { toCsv } from "@/lib/exports/csv";
import { AppError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("students:import");
    const { id } = await params;
    const job = await getStudentImportErrors(user, id);
    const rows = job.errors.map((error) => ({ row: error.row, fields: Object.entries(error.fields).map(([field, messages]) => `${field}: ${messages.join("; ")}`).join(" | ") }));
    await writeAuditLog(user, { action: "export", module: "students", entityType: "student_import_errors", entityId: job.id, campusId: job.campusId, metadata: { rowCount: rows.length } });
    return new NextResponse(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="student-import-${job.id}-errors.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("DATABASE_ERROR", "Unable to export import errors.", 500);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}
