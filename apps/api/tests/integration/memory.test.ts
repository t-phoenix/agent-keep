import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";

function testConfig() {
  process.env.SESSION_HMAC_SECRET = "test-secret-please-change";
  process.env.PAYMENT_ADAPTER = "mock";
  process.env.PAYMENT_MODE = "testnet";
  process.env.PAYTO_ADDRESS = "TESTPAYTO111111111111111111111111111111111111";
  return loadConfig();
}

describe("integration: memory + session + tenancy", () => {
  it("402 without payment, then put/get with mock pay + session", async () => {
    const { app } = createApp({ config: testConfig() });

    const unpaid = await app.request("http://localhost/v1/memory/foo", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: { hello: "world" } }),
    });
    expect(unpaid.status).toBe(402);
    const unpaidBody = await unpaid.json();
    expect(unpaidBody.error.code).toBe("payment_required");
    expect(unpaidBody.error.details.challenge.extra.tag).toBe("x402-global-challenge");

    const paid = await app.request("http://localhost/v1/memory/foo", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-agentkeep-mock-pay": "WALLET_A",
      },
      body: JSON.stringify({ value: { hello: "world" } }),
    });
    expect(paid.status).toBe(200);
    const session = paid.headers.get("x-agentkeep-session");
    expect(session).toBeTruthy();

    const got = await app.request("http://localhost/v1/memory/foo", {
      headers: { "x-agentkeep-session": session! },
    });
    expect(got.status).toBe(200);
    const gotBody = await got.json();
    expect(gotBody.value).toEqual({ hello: "world" });

    // Cross-wallet session cannot read
    const other = await app.request("http://localhost/v1/memory/foo", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-agentkeep-mock-pay": "WALLET_B",
      },
      body: JSON.stringify({ value: 1 }),
    });
    const sessionB = other.headers.get("x-agentkeep-session")!;
    const miss = await app.request("http://localhost/v1/memory/foo", {
      headers: { "x-agentkeep-session": sessionB },
    });
    // WALLET_B never wrote foo under their id — 404
    // Actually WALLET_B just wrote foo! So they get their own value.
    expect(miss.status).toBe(200);
    expect((await miss.json()).value).toBe(1);

    // WALLET_A still has original
    const aAgain = await app.request("http://localhost/v1/memory/foo", {
      headers: { "x-agentkeep-session": session! },
    });
    expect((await aAgain.json()).value).toEqual({ hello: "world" });
  });

  it("rejects payment replay nonce", async () => {
    const { app } = createApp({ config: testConfig() });
    const headers = {
      "content-type": "application/json",
      "x-agentkeep-mock-pay": "WALLET_R",
      "x-agentkeep-mock-nonce": "fixed-nonce-1",
    };
    const first = await app.request("http://localhost/v1/memory/k", {
      method: "PUT",
      headers,
      body: JSON.stringify({ value: 1 }),
    });
    expect(first.status).toBe(200);
    const second = await app.request("http://localhost/v1/memory/k2", {
      method: "PUT",
      headers,
      body: JSON.stringify({ value: 2 }),
    });
    expect(second.status).toBe(409);
    expect((await second.json()).error.code).toBe("payment_replay");
  });
});
