import { beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: headersMock }));

import { invalidateRequestMemo, memoizeRequest } from "@/lib/server/request-memo";

describe("request-local memoization", () => {
  let requestId = "request-12345678";

  beforeEach(() => {
    headersMock.mockImplementation(() => ({ get: () => requestId }));
    invalidateRequestMemo();
  });

  it("collapses concurrent work within one request", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return "value";
    };

    await expect(Promise.all([
      memoizeRequest("same", loader),
      memoizeRequest("same", loader),
    ])).resolves.toEqual(["value", "value"]);
    expect(calls).toBe(1);
  });

  it("does not share values across request IDs", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return calls;
    };

    await expect(memoizeRequest("scoped", loader)).resolves.toBe(1);
    requestId = "request-87654321";
    await expect(memoizeRequest("scoped", loader)).resolves.toBe(2);
  });

  it("allows a failed value to be retried and supports explicit invalidation", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      if (calls === 1) throw new Error("temporary failure");
      return "recovered";
    };

    await expect(memoizeRequest("retry", loader)).rejects.toThrow("temporary failure");
    await expect(memoizeRequest("retry", loader)).resolves.toBe("recovered");
    invalidateRequestMemo("retry");
    await expect(memoizeRequest("retry", loader)).resolves.toBe("recovered");
    expect(calls).toBe(3);
  });
});
