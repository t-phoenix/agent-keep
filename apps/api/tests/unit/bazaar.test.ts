import { describe, expect, it } from "vitest";
import { validateDiscoveryExtension } from "@x402/extensions/bazaar";
import {
  discoveryCatalog,
  discoveryForRoute,
  merchantExtension,
  ROUTE_DISCOVERY,
  wellKnownX402,
  MAINNET_CAIP2,
  MAINNET_USDC_ASA,
} from "../../src/payments/bazaar.js";
import type { AppConfig } from "../../src/config.js";

const mainnetConfig = {
  publicApiBase: "https://example.test",
  payment: {
    mode: "mainnet",
    payTo: "PAYTOMAINNETADDRESS000000000000000000000000000000000",
    challengeTag: "x402-global-challenge",
    usdcAsaId: MAINNET_USDC_ASA,
    caip2: MAINNET_CAIP2,
  },
} as unknown as AppConfig;

describe("bazaar discovery", () => {
  it("returns extensions for memory template routes", () => {
    const ext = discoveryForRoute("PUT /v1/memory/plan", mainnetConfig);
    expect(ext).toBeTruthy();
    expect(ext!.bazaar).toBeTruthy();
    expect(ext!["x402-merchant"]).toBeTruthy();
  });

  it("lists catalog routes with Mainnet pay metadata", () => {
    const cat = discoveryCatalog(mainnetConfig);
    expect(cat.tag).toBe("x402-global-challenge");
    expect(cat.network_caip2).toBe(MAINNET_CAIP2);
    expect(cat.asa_id).toBe(MAINNET_USDC_ASA);
    expect(cat.routes.some((r) => r.route.includes("memory"))).toBe(true);
    expect(cat.how_to_pay.steps.length).toBeGreaterThan(2);
  });

  it("well-known x402 is official resources[] shape on Mainnet", () => {
    const doc = wellKnownX402(mainnetConfig);
    expect(doc.x402Version).toBe(2);
    expect(doc.name).toBe("AgentKeep");
    expect(doc.resources.length).toBeGreaterThan(0);
    for (const r of doc.resources) {
      expect(r.network).toBe(MAINNET_CAIP2);
      expect(r.asset).toBe(String(MAINNET_USDC_ASA));
      expect(r.payTo).toBe(mainnetConfig.payment.payTo);
      expect(r.extra.tag).toBe("x402-global-challenge");
    }
  });

  it("merchant extension has name/website/categories without logo", () => {
    const m = merchantExtension(mainnetConfig)["x402-merchant"] as {
      info: { name: string; website: string; logo?: string; categories: string[] };
    };
    expect(m.info.name).toBe("AgentKeep");
    expect(m.info.website).toContain("example.test");
    expect(m.info.logo).toBeUndefined();
    expect(m.info.categories).toContain("algorand");
  });

  it("embeds HTTP method so GoPlausible bazaar validation accepts every route", () => {
    for (const [route, meta] of Object.entries(ROUTE_DISCOVERY)) {
      const bazaar = (meta.extensions as { bazaar?: { info?: { input?: { method?: string } } } })
        .bazaar;
      expect(bazaar?.info?.input?.method, route).toBe(meta.method);
      const result = validateDiscoveryExtension(
        (meta.extensions as { bazaar: Parameters<typeof validateDiscoveryExtension>[0] }).bazaar,
      );
      expect(result.valid, `${route}: ${result.errors?.join(", ")}`).toBe(true);
    }
  });

  it("sets routeTemplate for dynamic memory path", () => {
    const ext = discoveryForRoute("PUT /v1/memory/canary") as {
      bazaar?: { routeTemplate?: string };
    };
    expect(ext.bazaar?.routeTemplate).toBe("/v1/memory/:key");
  });
});
