import { NextResponse } from "next/server";
import { receiveWebhook } from "@/features/integrations/services/integration.service";
import { enforceRateLimit, requestClientKey } from "@/lib/security/rate-limit";
import { AppError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const organizationId = request.headers.get("x-organization-id")?.trim();
    const provider = (await params).provider.trim();
    const eventId = request.headers.get("x-webhook-event-id")?.trim();
    const signature = request.headers.get("x-webhook-signature")?.trim();
    if (!organizationId || !eventId || !signature || !/^[a-z0-9_.-]{2,80}$/i.test(provider)) throw new AppError("VALIDATION_ERROR", "Webhook identity headers are required.", 422);
    await enforceRateLimit(`webhook:${organizationId}:${provider}:${requestClientKey(request)}`, 120, 60_000);
    const body = await request.text();
    if (!body || body.length > 1_000_000) throw new AppError("VALIDATION_ERROR", "Webhook payload is empty or too large.", 422);
    const result = await receiveWebhook({ organizationId, campusId: request.headers.get("x-campus-id")?.trim() || undefined, provider, eventId, eventType: request.headers.get("x-webhook-event-type")?.trim().slice(0, 120) || "unknown", signature, body });
    return NextResponse.json({ ok: true, duplicate: result.duplicate, eventId: result.id }, { status: result.duplicate ? 200 : 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("DATABASE_ERROR", "Unable to receive webhook.", 500);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}
