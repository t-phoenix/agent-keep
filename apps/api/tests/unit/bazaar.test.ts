import { describe, expect, it } from "vitest";
import { discoveryCatalog, discoveryForRoute } from "../../src/payments/bazaar.js";

describe("bazaar discovery", () => {
  it("returns extensions for memory template routes", () => {
    const ext = discoveryForRoute("PUT /v1/memory/plan");
    expect(ext).toBeTruthy();
    expect(Object.keys(ext!).length).toBeGreaterThan(0);
  });

  it("lists catalog routes", () => {
    const cat = discoveryCatalog("https://example.test");
    expect(cat.tag).toBe("x402-global-challenge");
    expect(cat.routes.some((r) => r.route.includes("memory"))).toBe(true);
  });
});
