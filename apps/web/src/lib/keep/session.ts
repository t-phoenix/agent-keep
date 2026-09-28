/** Readable claims from an AgentKeep session token. The HMAC stays on the server. */

export type SessionClaims = {
  walletId: string;
  exp: number;
};

function decodeBase64Url(body: string): string {
  const pad = body.length % 4 === 0 ? "" : "=".repeat(4 - (body.length % 4));
  const b64 = body.replace(/-/g, "+").replace(/_/g, "/") + pad;
  if (typeof atob === "function") return atob(b64);
  return Buffer.from(b64, "base64").toString("utf8");
}

/** Decode wallet id and expiry. Does not check the signature. */
export function decodeSession(token: string): SessionClaims | null {
  const body = token.split(".")[0];
  if (!body) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(body)) as Partial<SessionClaims>;
    if (typeof payload.walletId !== "string" || typeof payload.exp !== "number") return null;
    if (!Number.isFinite(payload.exp)) return null;
    return { walletId: payload.walletId, exp: payload.exp };
  } catch {
    return null;
  }
}

export function isSessionLive(token: string | null | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const claims = decodeSession(token);
  return Boolean(claims && claims.exp > now);
}

export function sessionRemainingMs(token: string | null | undefined, now = Date.now()): number {
  if (!token) return 0;
  const claims = decodeSession(token);
  if (!claims) return 0;
  return Math.max(0, claims.exp - now);
}

/** m:ss remaining, for the live-session chip. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
