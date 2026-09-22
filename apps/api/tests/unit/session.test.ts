import { describe, expect, it } from "vitest";
import { mintSessionToken, toWalletId, verifySessionToken } from "../../src/lib/session.js";

describe("session", () => {
  const secret = "test-secret";

  it("mints and verifies within TTL", () => {
    const token = mintSessionToken("algo:ABC", secret, 1_000_000);
    const payload = verifySessionToken(token, secret, 1_000_000 + 60_000);
    expect(payload?.walletId).toBe("algo:ABC");
  });

  it("rejects expired", () => {
    const token = mintSessionToken("algo:ABC", secret, 1_000_000);
    expect(verifySessionToken(token, secret, 1_000_000 + 16 * 60_000)).toBeNull();
  });

  it("rejects tampered", () => {
    const token = mintSessionToken("algo:ABC", secret);
    expect(verifySessionToken(token + "x", secret)).toBeNull();
  });

  it("builds wallet id", () => {
    expect(toWalletId(" ADDR ")).toBe("algo:ADDR");
  });
});
