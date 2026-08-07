import { createHash, randomBytes } from "node:crypto";

export function createInvitationToken() {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashInvitationToken(rawToken) };
}

export function hashInvitationToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function invitationUrl(rawToken: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL is required to create invitation links.");
  return `${baseUrl.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(rawToken)}`;
}
