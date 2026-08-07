import { NextResponse } from "next/server";
import { getPublicCmsPage } from "@/features/community/services/community.service";
import { AppError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const organization = new URL(request.url).searchParams.get("organization")?.trim();
    const slug = (await params).slug.trim();
    if (!organization || !/^[a-z0-9-]{2,120}$/i.test(organization)) throw new AppError("VALIDATION_ERROR", "An organization slug is required.", 422);
    const result = await getPublicCmsPage(organization, slug);
    if (!result) throw new AppError("NOT_FOUND", "Published page not found.", 404);
    return NextResponse.json({ slug: result.page.slug, title: result.page.title, body: result.page.body, seo: result.page.seoJson ? JSON.parse(result.page.seoJson) : null, organization: result.organizationName, timezone: result.timezone }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("DATABASE_ERROR", "Unable to load public page.", 500);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}
