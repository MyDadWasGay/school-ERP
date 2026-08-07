import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin";
import { bootstrapSchema } from "@/features/foundation/schemas/bootstrap.schema";
import { bootstrapSchool } from "@/features/foundation/services/bootstrap.service";

export async function POST(request: Request) {
  const auth = getFirebaseAdminAuth();
  if (!auth) return NextResponse.json({ error: "Firebase Admin is not configured on the server." }, { status: 503 });
  try {
    const body = await request.json() as { idToken?: string } & Record<string, unknown>;
    if (!body.idToken) return NextResponse.json({ error: "Missing Firebase token. Please try again." }, { status: 400 });
    const parsed = bootstrapSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your school details." }, { status: 400 });
    const decoded = await auth.verifyIdToken(body.idToken);
    if (!decoded.email) return NextResponse.json({ error: "Your Firebase account does not have an email address." }, { status: 400 });
    const result = await bootstrapSchool(parsed.data, { uid: decoded.uid, email: decoded.email, displayName: decoded.name ?? decoded.email, emailVerified: decoded.email_verified === true });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create the school." }, { status });
  }
}
