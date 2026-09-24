import { createHmac } from "node:crypto";
import { describe, expect, it, vi, afterEach } from "vitest";
import { createApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";

function testConfig() {
  process.env.SESSION_HMAC_SECRET = "test-secret-please-change";
  process.env.PAYMENT_ADAPTER = "mock";
  process.env.NODE_ENV = "test";
  process.env.OWNER_WEB_BASE = "https://owner.test";
  process.env.PUBLIC_API_BASE = "https://api.test";
  process.env.ARTIFACTS_BASE = "https://api.test/a";
  process.env.R2_ACCOUNT_ID = "";
  process.env.R2_ACCESS_KEY_ID = "";
  process.env.R2_SECRET_ACCESS_KEY = "";
  process.env.R2_BUCKET = "";
  process.env.EMAIL_API_KEY = "";
  process.env.EMAIL_FROM = "";
  return loadConfig();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("artifacts + notify with email", () => {
  it("uploads artifact and serves public /a/:id", async () => {
    const { app } = createApp({ config: testConfig() });
    const up = await app.request("http://localhost/v1/artifacts", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "x-agentkeep-mock-pay": "ART_WALLET",
      },
      body: "hello-artifact",
    });
    expect(up.status).toBe(200);
    const body = (await up.json()) as { id: string; url: string; sha256: string };
    expect(body.url).toContain(body.id);
    expect(body.sha256).toHaveLength(64);

    const got = await app.request(`http://localhost/a/${body.id}`);
    expect(got.status).toBe(200);
    expect(await got.text()).toBe("hello-artifact");
  });

  it("rejects HTML artifacts", async () => {
    const { app } = createApp({ config: testConfig() });
    const up = await app.request("http://localhost/v1/artifacts", {
      method: "POST",
      headers: {
        "content-type": "text/html",
        "x-agentkeep-mock-pay": "ART_WALLET2",
      },
      body: "<html></html>",
    });
    expect(up.status).toBe(415);
  });

  it("binds email, creates notify, sends Resend, signed action resolves", async () => {
    process.env.EMAIL_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "onboarding@resend.dev";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));

    const { app } = createApp({ config: loadConfig() });
    const payer = "NOTIFY_WALLET";
    const walletId = `algo:${payer}`;

    const bind = await app.request("http://localhost/v1/owner/bind/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agentkeep-mock-pay": payer,
      },
      body: JSON.stringify({ email: "Owner@Example.COM" }),
    });
    expect(bind.status).toBe(200);
    expect((await bind.json()).email).toBe("owner@example.com");

    const notify = await app.request("http://localhost/v1/notify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agentkeep-mock-pay": payer,
      },
      body: JSON.stringify({ question: "Approve $0.05?" }),
    });
    expect(notify.status).toBe(200);
    const n = (await notify.json()) as { id: string; email_sent: boolean };
    expect(n.email_sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalled();

    const token = createHmac("sha256", "test-secret-please-change")
      .update(`${n.id}:${walletId}:approved`)
      .digest("hex");

    const action = await app.request(
      `http://localhost/owner/notify/${n.id}/action?wallet_id=${encodeURIComponent(walletId)}&status=approved&token=${token}`,
    );
    expect(action.status).toBe(200);
    expect(await action.text()).toContain("approved");
  });
});
