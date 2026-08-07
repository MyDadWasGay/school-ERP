import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { logger } from "@/lib/observability/logger";
import { missingRuntimeConfiguration } from "@/lib/config/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const missing = missingRuntimeConfiguration();
    if (missing.length) {
      logger.error("health.ready_configuration_failed", { missingCount: missing.length });
      return NextResponse.json({ status: "not_ready" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    await getDb().run(sql`select 1`);
    return NextResponse.json({ status: "ready", database: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("health.ready_failed", { error: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ status: "not_ready" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
