import "server-only";
import { cookies } from "next/headers";
import { ACTIVE_CAMPUS_COOKIE, SESSION_COOKIE } from "@/config/constants";
import { getFirebaseAdminAuth } from "./firebase-admin";
import { sessionFingerprint } from "./session-fingerprint";

export type SessionIdentity = {
  uid: string;
  fingerprint: string;
  expiresAt?: Date;
};

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
