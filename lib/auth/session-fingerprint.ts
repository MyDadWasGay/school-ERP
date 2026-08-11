import { createHash } from "node:crypto";

export function sessionFingerprint(sessionCookie: string) {
  return createHash("sha256").update(sessionCookie).digest("hex");
}
