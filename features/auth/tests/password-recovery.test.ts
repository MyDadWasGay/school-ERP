import { describe, expect, it } from "vitest";
import { PASSWORD_RECOVERY_MESSAGE } from "../components/forgot-password-form";

describe("password recovery messaging", () => {
  it("uses a non-enumerating response", () => {
    expect(PASSWORD_RECOVERY_MESSAGE).toBe("If an eligible account exists, reset instructions have been sent.");
  });
});
