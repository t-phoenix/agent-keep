import { describe, expect, it } from "vitest";
import { decodeSession, formatCountdown, isSessionLive, sessionRemainingMs } from "./session";

function token(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.sig`;
}

describe("session claims", () => {
  it("treats a future expiry as live", () => {
    const now = 1_000_000;
    const signed = token({ walletId: "algo:ADDR", exp: now + 60_000 });
    expect(decodeSession(signed)).toEqual({ walletId: "algo:ADDR", exp: now + 60_000 });
    expect(isSessionLive(signed, now)).toBe(true);
    expect(sessionRemainingMs(signed, now)).toBe(60_000);
    expect(formatCountdown(60_000)).toBe("1:00");
    expect(formatCountdown(9_100)).toBe("0:10");
  });

  it("treats a past expiry as ended", () => {
    const now = 1_000_000;
    const signed = token({ walletId: "algo:ADDR", exp: now - 1 });
    expect(isSessionLive(signed, now)).toBe(false);
    expect(sessionRemainingMs(signed, now)).toBe(0);
    expect(isSessionLive(null, now)).toBe(false);
  });

  it("rejects a token without claims", () => {
    expect(decodeSession("not-a-token")).toBeNull();
    expect(decodeSession(token({ walletId: 1, exp: 5 }))).toBeNull();
  });
});
