import "server-only";

import { SchoolErpApiClient, SchoolErpApiError } from "./client";
import {
  readActiveCampusId,
  readApiCookieHeader,
  readCsrfCookie,
  readSessionIdentity,
} from "@/lib/auth/session";

export function apiBaseUrl() {
  const value = (
    process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  )?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "development") return "http://localhost:3001";
  throw new Error(
    "API_INTERNAL_BASE_URL or NEXT_PUBLIC_API_BASE_URL must be configured.",
  );
}

export async function createPublicServerApiClient() {
  return new SchoolErpApiClient({
    baseUrl: apiBaseUrl(),
    useSessionCookie: true,
    credentials: "include",
  });
}

export async function createServerApiClient() {
  const [identity, campusId, cookieHeader, csrfToken] = await Promise.all([
    readSessionIdentity(),
    readActiveCampusId(),
    readApiCookieHeader(),
    readCsrfCookie(),
  ]);
  if (!identity || !cookieHeader)
    throw new SchoolErpApiError(
      401,
      "UNAUTHENTICATED",
      "A valid web session is required.",
    );
  return new SchoolErpApiClient({
    baseUrl: apiBaseUrl(),
    useSessionCookie: true,
    getCookieHeader: () => cookieHeader,
    getCsrfToken: () => csrfToken,
    getCampusId: () => campusId,
  });
}
