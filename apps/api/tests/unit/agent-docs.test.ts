import { describe, expect, it } from "vitest";
import { rootHtml, skillMd } from "../../src/discovery/agent-docs.js";
import { merchantExtension } from "../../src/payments/bazaar.js";
import type { AppConfig } from "../../src/config.js";

const config = {
  publicApiBase: "https://api.agentkeep.online",
  siteUrl: "https://agentkeep.online",
  payment: { payTo: "PAY", challengeTag: "x402-global-challenge" },
} as unknown as AppConfig;

describe("agent docs", () => {
  it("homepage points humans at the website and agents at llms.txt", () => {
    const html = rootHtml(config);
    expect(html).toContain('href="https://agentkeep.online"');
    expect(html).toContain("https://api.agentkeep.online");
    expect(html).toContain("/llms.txt");
    expect(html).toContain("PUT");
    expect(html).toContain("/v1/memory/:key");
    expect(html).toContain("/skill.md");
  });

  it("skill.md states purpose, API host, and how to pay", () => {
    const md = skillMd(config);
    expect(md.startsWith("# AgentKeep")).toBe(true);
    expect(md).toContain("https://api.agentkeep.online");
    expect(md).toContain("PAYMENT-SIGNATURE");
    expect(md).toContain("When not to call");
  });

  it("merchant website is the marketing site when SITE_URL is set", () => {
    const m = merchantExtension(config)["x402-merchant"] as { info: { website: string } };
    expect(m.info.website).toBe("https://agentkeep.online");
  });
});
