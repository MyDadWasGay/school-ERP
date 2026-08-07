import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicCmsForm, submitPublicCmsForm } from "@/features/community/services/community.service";
import { AppError } from "@/lib/errors/app-error";
import { enforceRateLimit, requestClientKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
const payloadSchema = z.record(z.union([z.string().max(2_000), z.number(), z.boolean(), z.null()]));

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const form = await getPublicCmsForm((await params).id.trim());
    if (!form) throw new AppError("NOT_FOUND", "Published form not found.", 404);
    return NextResponse.json({ id: form.id, name: form.name, fields: form.fields }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("DATABASE_ERROR", "Unable to load public form.", 500);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const formId = (await params).id.trim();
    await enforceRateLimit(`public-form:${formId}:${requestClientKey(request)}`, 10, 10 * 60_000);
    const body = await request.text();
    if (!body || body.length > 100_000) throw new AppError("VALIDATION_ERROR", "Form submission is empty or too large.", 422);
    const raw = JSON.parse(body) as unknown;
    const payload = payloadSchema.safeParse(raw);
    if (!payload.success) throw new AppError("VALIDATION_ERROR", "Form submission fields are invalid.", 422);
    if (payload.data.website) throw new AppError("VALIDATION_ERROR", "Form submission rejected.", 422);
    const result = await submitPublicCmsForm(formId, payload.data);
    return NextResponse.json({ ok: true, submissionId: result.submissionId, enquiryId: result.enquiryId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("VALIDATION_ERROR", "Unable to submit form.", 422);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}
