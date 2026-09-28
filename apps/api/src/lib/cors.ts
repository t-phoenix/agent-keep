/** Browser origins allowed to call the API and read session / payment headers. */

const ALWAYS = new Set([
  "https://agentkeep.online",
  "https://www.agentkeep.online",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export const CORS_ALLOW_HEADERS = [
  "Content-Type",
  "PAYMENT-SIGNATURE",
  "X-PAYMENT",
  "Idempotency-Key",
  "X-AgentKeep-Session",
  "X-AgentKeep-Mock-Pay",
  "X-Request-Id",
].join(", ");

export const CORS_EXPOSE_HEADERS = [
  "X-AgentKeep-Session",
  "PAYMENT-REQUIRED",
  "PAYMENT-RESPONSE",
  "Payment-Required",
  "X-Request-Id",
].join(", ");

export const CORS_ALLOW_METHODS = "GET, PUT, POST, DELETE, OPTIONS, HEAD";

/** Echo the request origin when it is the marketing site, SITE_URL, or local web dev. */
export function corsAllowOrigin(origin: string, siteUrl: string): string | null {
  const trimmed = origin.trim();
  if (!trimmed) return null;
  if (ALWAYS.has(trimmed)) return trimmed;
  const site = siteUrl.trim().replace(/\/$/, "");
  if (site && trimmed === site) return trimmed;
  return null;
}
