import { describe, expect, it } from "vitest";
import { dollarsToMinor, ROUTE_PRICES_MINOR } from "../../src/lib/money.js";

describe("money", () => {
  it("converts dollars to minor units without float drift for listed prices", () => {
    expect(dollarsToMinor(0.001)).toBe(1000);
    expect(dollarsToMinor("$0.01")).toBe(10_000);
    expect(dollarsToMinor(0.0005)).toBe(500);
    expect(ROUTE_PRICES_MINOR["POST /v1/fetch"]).toBe(10_000);
  });
});
