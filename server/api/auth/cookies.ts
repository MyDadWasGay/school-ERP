import { randomBytes } from "node:crypto";

export type CookieOptions = {
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  domain?: string;
};

export function readCookieValue(rawCookie: string | undefined, name: string) {
  for (const part of (rawCookie ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function createCsrfToken() {
  return randomBytes(32).toString("hex");
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  return parts.join("; ");
}

export function expiredCookie(name: string, options: CookieOptions = {}) {
  return serializeCookie(name, "", {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}

export function apiCookieIsSecure() {
  return process.env.NODE_ENV === "production" ||
    process.env.CONFIG_ENV === "staging" ||
    process.env.CONFIG_ENV === "production";
}

export function apiCookieOptions(maxAge: number): CookieOptions {
  return {
    maxAge,
    httpOnly: true,
    secure: apiCookieIsSecure(),
    sameSite: "lax",
    path: "/",
    domain: process.env.API_COOKIE_DOMAIN?.trim() || undefined,
  };
}
