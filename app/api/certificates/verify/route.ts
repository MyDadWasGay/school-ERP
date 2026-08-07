import { NextResponse } from "next/server";
import { getCertificateByVerificationCode } from "@/features/students/services/students.service";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (code.length < 10 || code.length > 120) return NextResponse.json({ valid: false }, { status: 400 });
  const certificate = await getCertificateByVerificationCode(code);
  if (!certificate) return NextResponse.json({ valid: false }, { status: 404 });
  const student = certificate.snapshot.student;
  const studentRecord = student && typeof student === "object" ? student as Record<string, unknown> : {};
  return NextResponse.json({
    valid: true,
    certificateNumber: certificate.certificateNumber,
    certificateType: certificate.certificateType,
    issuedAt: certificate.issuedAt,
    studentName: [studentRecord.firstName, studentRecord.lastName].filter((value): value is string => typeof value === "string" && value.length > 0).join(" "),
    admissionNumber: typeof studentRecord.admissionNumber === "string" ? studentRecord.admissionNumber : undefined,
  }, { headers: { "Cache-Control": "no-store" } });
}
