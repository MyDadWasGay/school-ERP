import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTIVE_CAMPUS_COOKIE } from "@/config/constants";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";

const campusSelectionSchema = z.object({ campusId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = campusSelectionSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Campus is required.", 422);
    const campus = user.availableCampuses?.find(({ id }) => id === parsed.data.campusId);
    if (!campus) throw new AppError("TENANT_SCOPE_ERROR", "Campus is outside your assigned scope.", 403);
    const response = NextResponse.json({ ok: true, campus });
    response.cookies.set(ACTIVE_CAMPUS_COOKIE, campus.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("FORBIDDEN", "Unable to change campus.", 403);
    return NextResponse.json({ error: appError.message }, { status: appError.status });
  }
}
