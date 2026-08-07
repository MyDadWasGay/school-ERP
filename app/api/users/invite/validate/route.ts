import { NextResponse } from "next/server";
import { validateInvitation } from "@/features/users/services/invitation.service";
import { enforceRateLimit, requestClientKey } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    await enforceRateLimit(`invite-validate:${requestClientKey(request)}`, 20, 60_000);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 429;
    return NextResponse.json({ valid: false, error: "Too many requests. Try again later." }, { status, headers: { "Cache-Control": "no-store" } });
  }
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (token.length < 40 || token.length > 160) return NextResponse.json({ valid: false }, { status: 400 });
  const invitation = await validateInvitation(token);
  if (!invitation) return NextResponse.json({ valid: false }, { status: 404 });
  return NextResponse.json({ valid: true, ...invitation }, { headers: { "Cache-Control": "no-store" } });
}
