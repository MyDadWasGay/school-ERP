import { NextResponse } from "next/server";
import { getTransportManifest } from "@/features/transport/services/transport.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AppError } from "@/lib/errors/app-error";
import { toCsv } from "@/lib/exports/csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const routeId = new URL(request.url).searchParams.get("routeId")?.trim();
    if (!routeId) throw new AppError("VALIDATION_ERROR", "routeId is required.", 422);
    const user = await requirePermission("transport:export");
    const manifest = await getTransportManifest(user, routeId);
    const body = toCsv(manifest.rows.map((row) => ({ route: row.route, student: row.student, admissionNumber: row.admissionNumber, stop: row.stop })));
    await writeAuditLog(user, { action: "export", module: "transport", entityType: "route_manifest", entityId: routeId, campusId: user.campusId, metadata: { rowCount: manifest.rows.length } });
    return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="transport-manifest-${routeId}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("DATABASE_ERROR", "Unable to export transport manifest.", 500);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}

