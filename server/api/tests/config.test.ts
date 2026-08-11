import { describe, expect, it } from "vitest";
import { readCorsOrigins } from "../config";

describe("API CORS configuration", () => {
  it("accepts a bounded explicit origin allow-list", () => {
    expect(
      readCorsOrigins("https://erp.example.com,http://localhost:3000"),
    ).toEqual(["https://erp.example.com", "http://localhost:3000"]);
  });

  it("rejects wildcard, path and non-HTTP values", () => {
    expect(() => readCorsOrigins("*")).toThrow(/explicit HTTP/i);
    expect(() => readCorsOrigins("https://erp.example.com/path")).toThrow(
      /without paths/i,
    );
    expect(() => readCorsOrigins("file:///tmp/api")).toThrow(/explicit HTTP/i);
  });
});
