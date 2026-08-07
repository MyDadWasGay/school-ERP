import { NextResponse } from "next/server";
import { runStudentImport } from "@/features/import-export/services/student-import.service";
import { requirePermission } from "@/lib/auth/guards";
import { enforceRateLimit, requestClientKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`student-import:${requestClientKey(request)}`, 5, 10 * 60_000);
    const user = await requirePermission("students:import");
    const csv = await request.text();
    if (!csv.trim() || csv.length > 5_000_000) return NextResponse.json({ error: "A CSV body between 1 byte and 5 MB is required." }, { status: 422 });
    const result = await runStudentImport(user, csv, { idempotencyKey: request.headers.get("x-idempotency-key")?.trim() || undefined });
    return NextResponse.json({ ok: true, queued: result.queued, jobId: result.job.id, importJobId: result.importJobId, importedRows: result.importedRows, errorRows: result.errors.length, errors: result.errors.slice(0, 50) }, { status: result.queued ? 202 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import students." }, { status });
  }
}
