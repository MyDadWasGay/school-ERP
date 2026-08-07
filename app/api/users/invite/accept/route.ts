import { NextResponse } from "next/server";
import { invitationAcceptSchema } from "@/features/users/schemas/invitation.schema";
import { acceptInvitation } from "@/features/users/services/invitation.service";
import { enforceRateLimit, requestClientKey } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`invite-accept:${requestClientKey(request)}`, 10, 10 * 60_000);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 429;
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status });
  }
  const parsed = invitationAcceptSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invitation details are invalid." }, { status: 400 });
  try {
    const result = await acceptInvitation(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to accept invitation." }, { status });
  }
}
