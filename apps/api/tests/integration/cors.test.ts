import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";

function testConfig() {
  process.env.SESSION_HMAC_SECRET = "test-secret-please-change";
  process.env.PAYMENT_ADAPTER = "mock";
  process.env.PAYMENT_MODE = "testnet";
  process.env.PAYTO_ADDRESS = "TESTPAYTO111111111111111111111111111111111111";
  process.env.SITE_URL = "https://agentkeep.online";
  return loadConfig();
}

describe("integration: browser CORS", () => {
  it("answers a preflight from the marketing origin with payment headers", async () => {
    const { app } = createApp({ config: testConfig() });
    const res = await app.request("http://localhost/v1/memory/plan", {
      method: "OPTIONS",
      headers: {
        origin: "https://agentkeep.online",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type,payment-signature,idempotency-key",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://agentkeep.online");
    const allow = (res.headers.get("access-control-allow-headers") ?? "").toLowerCase();
    expect(allow).toContain("payment-signature");
    expect(allow).toContain("idempotency-key");
    expect(allow).toContain("content-type");
  });

  it("exposes the session header on a settled response", async () => {
    const { app } = createApp({ config: testConfig() });
    const paid = await app.request("http://localhost/v1/memory/cors-key", {
      method: "PUT",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        "x-agentkeep-mock-pay": "WALLET_CORS",
      },
      body: JSON.stringify({ value: { note: "hi" } }),
    });
    expect(paid.status).toBe(200);
    expect(paid.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const expose = (paid.headers.get("access-control-expose-headers") ?? "").toLowerCase();
    expect(expose).toContain("x-agentkeep-session");
    expect(expose).toContain("payment-required");
    expect(paid.headers.get("x-agentkeep-session")).toBeTruthy();
  });

  it("exposes PAYMENT-REQUIRED on a 402 from an allowed origin", async () => {
    const { app } = createApp({ config: testConfig() });
    const unpaid = await app.request("http://localhost/v1/memory", {
      headers: { origin: "https://agentkeep.online" },
    });
    expect(unpaid.status).toBe(402);
    expect(unpaid.headers.get("access-control-allow-origin")).toBe("https://agentkeep.online");
    expect(unpaid.headers.get("payment-required")).toBeTruthy();
    const expose = (unpaid.headers.get("access-control-expose-headers") ?? "").toLowerCase();
    expect(expose).toContain("payment-required");
  });

  it("does not echo a foreign origin", async () => {
    const { app } = createApp({ config: testConfig() });
    const res = await app.request("http://localhost/health", {
      headers: { origin: "https://evil.example" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
