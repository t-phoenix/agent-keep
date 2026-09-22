import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";

function testConfig() {
  process.env.SESSION_HMAC_SECRET = "test-secret-please-change";
  process.env.PAYMENT_ADAPTER = "mock";
  process.env.DEFAULT_DAILY_CAP_MINOR = "15000"; // $0.015
  return loadConfig();
}

describe("e2e mock flows", () => {
  it("full agent loop: pay memory → session budget → pay fetch SSRF block → receipts", async () => {
    const { app } = createApp({ config: testConfig() });
    const payer = "E2E_WALLET_1";

    const mem = await app.request("http://localhost/v1/memory/plan", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-agentkeep-mock-pay": payer,
      },
      body: JSON.stringify({ value: { step: 1 } }),
    });
    expect(mem.status).toBe(200);
    const session = mem.headers.get("x-agentkeep-session")!;

    const budget = await app.request("http://localhost/v1/budget", {
      headers: { "x-agentkeep-session": session },
    });
    expect(budget.status).toBe(200);
    const b = await budget.json();
    expect(b.spent_today_minor).toBe(1000);
    expect(b.remaining_today_minor).toBe(14000);

    const ssrf = await app.request("http://localhost/v1/fetch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agentkeep-mock-pay": payer,
      },
      body: JSON.stringify({ url: "http://127.0.0.1/secret" }),
    });
    expect(ssrf.status).toBe(400);
    expect((await ssrf.json()).error.code).toBe("ssrf_blocked");

    const receipts = await app.request("http://localhost/v1/budget/receipts", {
      headers: { "x-agentkeep-mock-pay": payer },
    });
    expect(receipts.status).toBe(200);
    const r = await receipts.json();
    expect(r.receipts.length).toBeGreaterThanOrEqual(1);

    const notify = await app.request("http://localhost/v1/notify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agentkeep-mock-pay": payer,
      },
      body: JSON.stringify({ question: "Approve spend?" }),
    });
    expect(notify.status).toBe(200);
    expect((await notify.json()).status).toBe("pending");

    const trust = await app.request("http://localhost/v1/trust?url=https://example.com", {
      headers: { "x-agentkeep-mock-pay": payer },
    });
    // may be 200 reachable or network-dependent; never 402 if paid
    expect([200, 400, 502, 504]).toContain(trust.status);
  });

  it("hits budget_exceeded before work when cap tight", async () => {
    process.env.DEFAULT_DAILY_CAP_MINOR = "500";
    const { app } = createApp({ config: loadConfig() });
    const res = await app.request("http://localhost/v1/fetch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agentkeep-mock-pay": "POOR_WALLET",
      },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("budget_exceeded");
  });
});
