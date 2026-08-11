"use client";

import { publicEnv } from "@/lib/env-public";
import { SchoolErpApiClient } from "./client";

export function readBrowserCsrfToken() {
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("school_erp_csrf="));
  return cookie ? decodeURIComponent(cookie.slice("school_erp_csrf=".length)) : undefined;
}

export function browserApiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readBrowserCsrfToken();
    if (csrf && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", csrf);
  }
  return fetch(path, { ...init, headers, credentials: "include" });
}

export function createBrowserApiClient(campusId?: string) {
  return new SchoolErpApiClient({
    baseUrl: typeof window === "undefined" ? publicEnv.apiBaseUrl : window.location.origin,
    getCampusId: () => campusId,
    useSessionCookie: true,
    credentials: "include",
    getCsrfToken: readBrowserCsrfToken,
  });
}
