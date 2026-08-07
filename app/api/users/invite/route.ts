import { NextResponse } from "next/server";
import { provisionUserSchema } from "@/features/users/schemas/provision.schema";
import { provisionUser } from "@/features/users/services/provision.service";
import { requirePermission } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit/audit-log";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("users:create");
    const parsed = provisionUserSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the user details." }, { status: 400 });
    const result = await provisionUser(actor, parsed.data);
    await writeAuditLog(actor, { action: "create", module: "users", entityType: "user", entityId: result.userId, after: { email: parsed.data.email, displayName: parsed.data.displayName, role: parsed.data.role, campusId: parsed.data.campusId } });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to invite user." }, { status });
  }
}
