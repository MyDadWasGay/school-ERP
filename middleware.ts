import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/config/constants";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const response = NextResponse.redirect(loginUrl);
    applySecurityHeaders(response, requestId);
    return response;
  }
  const response = NextResponse.next();
  applySecurityHeaders(response, requestId);
  return response;
}

function applySecurityHeaders(response: NextResponse, requestId: string) {
  response.headers.set("X-Request-ID", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export const config = {
  matcher: [
    "/platform/:path*",
    "/dashboard/:path*", "/organizations/:path*", "/campuses/:path*", "/users/:path*",
    "/students/:path*", "/certificates/:path*", "/admissions/:path*", "/academics/:path*",
    "/attendance/:path*", "/exams/:path*", "/fees/:path*", "/accounts/:path*", "/hr/:path*",
    "/payroll/:path*", "/teacher/:path*", "/parent/:path*", "/student/:path*",
    "/communication/:path*", "/library/:path*", "/transport/:path*", "/hostel/:path*",
    "/canteen/:path*", "/inventory/:path*", "/assets/:path*", "/procurement/:path*",
    "/health/:path*", "/safety/:path*", "/facilities/:path*", "/activities/:path*",
    "/alumni/:path*", "/cms/:path*", "/analytics/:path*", "/reports/:path*", "/alerts/:path*",
    "/data-quality/:path*", "/integrations/:path*", "/audit-logs/:path*", "/settings/:path*",
  ],
};
