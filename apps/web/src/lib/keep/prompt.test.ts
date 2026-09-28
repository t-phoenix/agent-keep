import { describe, expect, it } from "vitest";
import { agentPrompt, envConfig } from "./prompt";

describe("agent setup prompt", () => {
  it("includes the skill URL, ASA, and facilitator", () => {
    const text = agentPrompt({
      apiBase: "https://api.agentkeep.online/",
      siteUrl: "https://agentkeep.online/",
    });
    expect(text).toContain("https://agentkeep.online/skill.md");
    expect(text).toContain("31566704");
    expect(text).toContain("https://facilitator.goplausible.xyz");
    expect(text).toContain("X-AgentKeep-Session");
    expect(text).toContain("15 minutes");
    const env = envConfig("https://api.agentkeep.online");
    expect(env).toContain("ASA_ID=31566704");
    expect(env).toContain("FACILITATOR=https://facilitator.goplausible.xyz");
  });
});
