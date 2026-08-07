import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "school-erp" }, { headers: { "Cache-Control": "no-store" } });
}
