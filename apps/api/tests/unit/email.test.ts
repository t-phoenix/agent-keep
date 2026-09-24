import { describe, expect, it, vi } from "vitest";
import { notifyTicketEmailHtml, sendEmail } from "../../src/lib/email.js";

describe("email / Resend", () => {
  it("builds notify HTML with escaped question", () => {
    const html = notifyTicketEmailHtml({
      question: `Approve <script>alert(1)</script>?`,
      ticketId: "ntf_1",
      approveUrl: "https://example.test/approve",
      denyUrl: "https://example.test/deny",
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("https://example.test/approve");
  });

  it("posts to Resend API with bearer key", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );
    const result = await sendEmail(
      { apiKey: "re_test", from: "onboarding@resend.dev" },
      { to: "owner@example.com", subject: "hi", html: "<p>x</p>" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result).toEqual({ ok: true, id: "email_123" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect((init as RequestInit).headers).toMatchObject({
      authorization: "Bearer re_test",
    });
  });

  it("returns soft failure on Resend error", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 401 }));
    const result = await sendEmail(
      { apiKey: "bad", from: "onboarding@resend.dev" },
      { to: "a@b.c", subject: "s", html: "h" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
  });
});
