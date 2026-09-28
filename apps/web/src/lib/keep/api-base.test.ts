import { describe, expect, it } from "vitest";
import { keepRequestBase } from "./api-base";

describe("keep request base", () => {
  it("uses the Next dev server on localhost", () => {
    expect(keepRequestBase("https://api.agentkeep.online", "localhost")).toBe("");
    expect(keepRequestBase("https://api.agentkeep.online/", "127.0.0.1")).toBe("");
  });

  it("keeps the public API for the live site", () => {
    expect(keepRequestBase("https://api.agentkeep.online/", "agentkeep.online")).toBe(
      "https://api.agentkeep.online",
    );
  });
});
