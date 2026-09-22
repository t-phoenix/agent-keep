import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_TTL_MS = 15 * 60 * 1000;

export type SessionPayload = {
  walletId: string;
  exp: number;
};

export function mintSessionToken(walletId: string, secret: string, now = Date.now()): string {
  const payload: SessionPayload = { walletId, exp: now + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.walletId !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newRequestId(): string {
  return randomBytes(12).toString("hex");
}

/** Canonical algo: tenant id from Algorand address. */
export function toWalletId(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) throw new Error("empty address");
  // Algorand addresses are case-sensitive base32; store as-is after trim.
  return `algo:${trimmed}`;
}
