import { describe, expect, it } from "vitest";
import { createInvitationToken, hashInvitationToken } from "@/lib/auth/invitation-token";
import { invitationAcceptSchema } from "../schemas/invitation.schema";

describe("invitation activation", () => {
  it("generates a high-entropy token and stores only its hash", () => {
    const token = createInvitationToken();
    expect(token.rawToken.length).toBeGreaterThanOrEqual(40);
    expect(token.tokenHash).toHaveLength(64);
    expect(token.tokenHash).toBe(hashInvitationToken(token.rawToken));
    expect(token.tokenHash).not.toContain(token.rawToken);
  });

  it("requires a strong activation password", () => {
    const token = "a".repeat(48);
    expect(invitationAcceptSchema.safeParse({ token, password: "short" }).success).toBe(false);
    expect(invitationAcceptSchema.safeParse({ token, password: "LongEnoughPassword1" }).success).toBe(true);
  });
});
