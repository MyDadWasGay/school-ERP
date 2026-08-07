import { createHash, randomBytes } from "node:crypto";
import { resolveAppUrl } from "@/lib/config/app-url";

export function createInvitationToken() {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashInvitationToken(rawToken) };
}

export function hashInvitationToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function invitationUrl(rawToken: string) {
  const baseUrl = resolveAppUrl();
  if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL is required to create invitation links.");
  return `${baseUrl.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(rawToken)}`;
}
