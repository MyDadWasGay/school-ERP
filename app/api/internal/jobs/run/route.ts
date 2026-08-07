import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createId } from "@/lib/utils/ids";
import { runNextJob } from "@/lib/jobs/job-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidSecret(request: Request) {
  const expected = process.env.INTERNAL_JOB_SECRET?.trim();
  const received = request.headers.get("x-internal-job-secret")?.trim();
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export async function POST(request: Request) {
  if (!hasValidSecret(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let limit = 1;
  try {
    const body = await request.json().catch(() => ({})) as { limit?: unknown };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) limit = Math.min(10, Math.max(1, Math.floor(body.limit)));
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const workerId = createId("worker");
  const results = [];
  for (let index = 0; index < limit; index += 1) {
    const result = await runNextJob(workerId);
    results.push(result);
    if (result.status === "idle") break;
  }
  return NextResponse.json({ workerId, results }, { headers: { "Cache-Control": "no-store" } });
}

