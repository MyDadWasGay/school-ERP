import "server-only";

import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rateLimitBuckets } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { createId } from "@/lib/utils/ids";

export function requestClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown-client";
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const nowMs = Date.now();
  const windowStart = new Date(Math.floor(nowMs / windowMs) * windowMs);
  const keyHash = createHash("sha256").update(key).digest("hex");
  await getDb().transaction(async (tx) => {
    const existing = await tx.query.rateLimitBuckets.findFirst({ where: eq(rateLimitBuckets.keyHash, keyHash) });
    if (!existing || existing.windowStart.getTime() !== windowStart.getTime()) {
      if (existing) {
        await tx.update(rateLimitBuckets).set({ windowStart, requestCount: 1, updatedAt: new Date() }).where(and(eq(rateLimitBuckets.id, existing.id), eq(rateLimitBuckets.keyHash, keyHash)));
      } else {
        await tx.insert(rateLimitBuckets).values({ id: createId("rate_limit"), keyHash, windowStart, requestCount: 1 });
      }
      return;
    }
    if (existing.requestCount >= limit) throw new AppError("RATE_LIMITED", "Too many requests. Try again later.", 429);
    await tx.update(rateLimitBuckets).set({ requestCount: existing.requestCount + 1, updatedAt: new Date() }).where(and(eq(rateLimitBuckets.id, existing.id), eq(rateLimitBuckets.keyHash, keyHash), eq(rateLimitBuckets.requestCount, existing.requestCount)));
  });
}
