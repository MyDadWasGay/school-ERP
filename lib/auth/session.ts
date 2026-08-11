import "server-only";
import { cookies } from "next/headers";
import { ACTIVE_CAMPUS_COOKIE, CSRF_COOKIE, SESSION_COOKIE } from "@/config/constants";
import { getFirebaseAdminAuth } from "./firebase-admin";
import { sessionFingerprint } from "./session-fingerprint";

export type SessionIdentity = {
  uid: string;
  fingerprint: string;
  expiresAt?: Date;
};

// CLIENT_API_MIGRATION: This module intentionally remains the transitional
// Next.js web-cookie adapter. Fastify authenticates Flutter and browser API
// clients through its own documented credential boundary and must not depend
// on Next's cookies() API; both paths must resolve the same user context.
export async function readSessionIdentity(): Promise<SessionIdentity | undefined> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return undefined;
  const auth = getFirebaseAdminAuth();
  if (!auth) return undefined;
  try {
    const decoded = await auth.verifySessionCookie(session, true);
    return {
      uid: decoded.uid,
      fingerprint: sessionFingerprint(session),
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : undefined,
    };
  } catch {
    return undefined;
  }
}

export async function readSessionUid() {
  return (await readSessionIdentity())?.uid;
}

export async function readActiveCampusId() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_CAMPUS_COOKIE)?.value;
}

/** Server-only cookie forwarding helpers for the Fastify API client. */
export async function readApiSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function readCsrfCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value;
}

export async function readApiCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .filter(({ name }) =>
      [SESSION_COOKIE, ACTIVE_CAMPUS_COOKIE, CSRF_COOKIE].includes(name),
    )
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}
