import type { AppConfig } from "../config.js";
import { MAINNET_CAIP2, MAINNET_USDC_ASA, ROUTE_DISCOVERY } from "../payments/bazaar.js";

const SERVICE_NAME = "AgentKeep";
const SERVICE_BLURB =
  "Wallet-scoped OS primitives for AI agents — memory, fetch, budget receipts, trust, and owner-bound notify. No signup, no API keys. Pay per call with x402 (USDC on Algorand Mainnet via GoPlausible).";

function baseUrl(config: AppConfig): string {
  return config.publicApiBase.replace(/\/$/, "");
}

/** Root HTML for facilitator OG enrichment (no images). */
export function rootHtml(config: AppConfig): string {
  const base = baseUrl(config);
  const title = `${SERVICE_NAME} — agent OS primitives, paid per request (x402 / Algorand USDC)`;
  const desc = SERVICE_BLURB;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta property="og:site_name" content="${SERVICE_NAME}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(base)}" />
  <meta name="theme-color" content="#0B1F1A" />
  <link rel="canonical" href="${escapeHtml(base)}" />
</head>
<body>
  <h1>${SERVICE_NAME}</h1>
  <p>${escapeHtml(desc)}</p>
  <ul>
    <li><a href="/llms.txt">llms.txt</a></li>
    <li><a href="/agents.md">agents.md</a></li>
    <li><a href="/.well-known/x402">.well-known/x402</a></li>
    <li><a href="/.well-known/agent-card.json">agent-card.json</a></li>
    <li><a href="/v1/discovery">/v1/discovery</a></li>
    <li><a href="/health">/health</a></li>
  </ul>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Agent-readable usage guide (first `#` is merchant name for facilitator). */
export function llmsTxt(config: AppConfig): string {
  const base = baseUrl(config);
  const lines = [
    `# ${SERVICE_NAME}`,
    "",
    `> ${SERVICE_BLURB}`,
    ">",
    "> Separate product — not AgentCash / Stable*. Challenge tag: `x402-global-challenge`.",
    "",
    "## Network (Mainnet only)",
    "",
    `- Protocol: x402 v2`,
    `- Facilitator: https://facilitator.goplausible.xyz`,
    `- Network CAIP-2: \`${MAINNET_CAIP2}\``,
    `- Asset: USDC ASA \`${MAINNET_USDC_ASA}\``,
    `- payTo: \`${config.payment.payTo}\``,
    `- Tag on every paid 402: \`${config.payment.challengeTag}\``,
    "",
    "## How to pay",
    "",
    "1. Call a paid endpoint. Without payment you get **HTTP 402** and a `PAYMENT-REQUIRED` header (base64 JSON).",
    "2. Use any x402 client to pay the advertised `accepts[]` requirement (exact scheme, Algorand Mainnet USDC).",
    "3. Retry the **same** request with `PAYMENT-SIGNATURE`.",
    "4. On success: JSON body + ledger receipt + response header `X-AgentKeep-Session` (TTL 15 minutes).",
    "5. Use that session for free Memory GET / Budget GET. Never assume anonymous free GETs.",
    "6. Send `Idempotency-Key` on paid mutations when retrying to avoid double-charge.",
    "",
    "## Paid endpoints",
    "",
  ];

  for (const [route, meta] of Object.entries(ROUTE_DISCOVERY)) {
    const path = route.includes(" ") ? route.split(/\s+/)[1]! : route;
    const dollars = (meta.priceMinor / 1_000_000).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    lines.push(
      `- [${meta.method} ${path}](${base}${path}): ${meta.description} **$${dollars} USDC**.`,
    );
  }

  lines.push(
    "",
    "## Free with session (not public)",
    "",
    `- \`GET ${base}/v1/memory/{key}\` — requires \`X-AgentKeep-Session\` or payment proof`,
    `- \`GET ${base}/v1/budget\` — same`,
    "",
    "## Rules for agents",
    "",
    "- Wallet tenancy: data is scoped to the paying Algorand address (`algo:<address>`). Cross-wallet miss → **404** (no leak).",
    "- Hard daily cap default **$2 USDC**; on `budget_exceeded` stop — no side effects.",
    "- Notify recipients are **owner-bound only** — never supply arbitrary recipient addresses.",
    "- Fetch/trust/callback URLs go through SSRF guard — private IPs fail closed.",
    "- Credits offset future spend only; no withdraw.",
    "- Branch on `error.code` only (stable catalog).",
    "",
    "## Discovery files",
    "",
    `- ${base}/.well-known/x402`,
    `- ${base}/.well-known/agent-card.json`,
    `- ${base}/agents.md`,
    `- ${base}/v1/discovery`,
    `- ${base}/health`,
    "",
  );

  return lines.join("\n");
}

/** Operating instructions for coding agents (not indexed as name by facilitator). */
export function agentsMd(config: AppConfig): string {
  const base = baseUrl(config);
  return `# ${SERVICE_NAME}

Instructions for agents calling AgentKeep.

## Payment

Every route under \`/v1\` that is priced answers **HTTP 402** until paid with x402.

1. Read \`PAYMENT-REQUIRED\` (base64 JSON): \`resource\`, \`accepts[]\`, \`extensions.bazaar\`, \`extensions.x402-merchant\`.
2. Pay **Algorand Mainnet** USDC ASA \`${MAINNET_USDC_ASA}\` to \`payTo\` via GoPlausible (\`${MAINNET_CAIP2}\`).
3. Retry with \`PAYMENT-SIGNATURE\`. Store \`X-AgentKeep-Session\` for free GETs (15m).

Do **not** use Testnet for this deployment. Facilitator: https://facilitator.goplausible.xyz

## Endpoints (thin Composite)

| Method | Path | Price (USDC) | Notes |
|--------|------|--------------|-------|
| PUT | /v1/memory/:key | 0.001 | Body \`{ "value": ..., "content_type"? }\` |
| POST | /v1/fetch | 0.01 | Body \`{ "url", "method"? }\` — SSRF protected |
| GET | /v1/budget/receipts | 0.002 | Ledger export |
| GET | /v1/trust | 0.002 | Query \`?url=\` — ≤3s probe |
| POST | /v1/notify | 0.02 | Owner-bound; poll for terminal status |

Base URL: ${base}

## Assumptions

- Prices are always taken from the live 402 — never hardcode forever.
- Session does not replace payment for paid routes; it only unlocks free GETs.
- On \`payment_invalid\` / \`payment_replay\` / \`budget_exceeded\`, stop and escalate.

## Docs

- ${base}/llms.txt
- ${base}/.well-known/x402
- ${base}/v1/discovery
`;
}

export function agentCardJson(config: AppConfig) {
  const base = baseUrl(config);
  return {
    name: SERVICE_NAME,
    description: SERVICE_BLURB,
    url: base,
    version: "0.1.0",
    protocolVersion: "0.2.9",
    preferredTransport: "http",
    capabilities: { streaming: false },
    defaultInputModes: ["application/json", "text"],
    defaultOutputModes: ["application/json"],
    skills: Object.entries(ROUTE_DISCOVERY).map(([route, meta]) => {
      const path = route.includes(" ") ? route.split(/\s+/)[1]! : route;
      return {
        id: route.replace(/\s+/g, "_").replace(/[/:]/g, "_"),
        name: `${meta.method} ${path}`,
        description: meta.description,
        tags: ["x402", "algorand", "mainnet", config.payment.challengeTag],
        examples: [`${meta.method} ${base}${path}`],
      };
    }),
    payments: {
      protocol: "x402",
      network: MAINNET_CAIP2,
      asset: MAINNET_USDC_ASA,
      facilitator: "https://facilitator.goplausible.xyz",
      tag: config.payment.challengeTag,
    },
  };
}

export function agentManifestJson(config: AppConfig) {
  const base = baseUrl(config);
  return {
    name: SERVICE_NAME,
    description: SERVICE_BLURB,
    url: base,
    documentation: `${base}/llms.txt`,
    payments: {
      protocol: "x402",
      network: "algorand",
      asset: "USDC",
      asa_id: MAINNET_USDC_ASA,
      caip2: MAINNET_CAIP2,
      facilitator: "goplausible",
      tag: config.payment.challengeTag,
    },
  };
}
