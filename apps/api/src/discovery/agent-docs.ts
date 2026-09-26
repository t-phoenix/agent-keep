import type { AppConfig } from "../config.js";
import { MAINNET_CAIP2, MAINNET_USDC_ASA, ROUTE_DISCOVERY } from "../payments/bazaar.js";

const SERVICE_NAME = "AgentKeep";
const SERVICE_BLURB =
  "Wallet-scoped OS primitives for AI agents — memory, fetch, budget receipts, trust, and owner-bound notify. No signup, no API keys. Pay per call with x402 (USDC on Algorand Mainnet via GoPlausible).";

function baseUrl(config: AppConfig): string {
  return config.publicApiBase.replace(/\/$/, "");
}

function siteUrl(config: AppConfig): string {
  return (config.siteUrl || "https://agentkeep.online").replace(/\/$/, "");
}

function priceLabel(minor: number): string {
  return `$${(minor / 1_000_000).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")} USDC`;
}

/** Root HTML for humans and facilitator/agent crawlers (no images). */
export function rootHtml(config: AppConfig): string {
  const base = baseUrl(config);
  const site = siteUrl(config);
  const title = `${SERVICE_NAME} API — wallet memory, fetch, receipts, and notify (x402)`;
  const desc =
    "HTTP API for AI agents. Pay per request with USDC on Algorand Mainnet through the GoPlausible x402 facilitator. No signup and no API keys. Product site: agentkeep.online.";
  const rows = Object.entries(ROUTE_DISCOVERY)
    .map(([route, meta]) => {
      const path = route.includes(" ") ? route.split(/\s+/)[1]! : route;
      return `<tr><td><code>${escapeHtml(meta.method)}</code></td><td><a href="${escapeHtml(base + path)}"><code>${escapeHtml(path)}</code></a></td><td>${escapeHtml(priceLabel(meta.priceMinor))}</td><td>${escapeHtml(meta.description)}</td></tr>`;
    })
    .join("\n");
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebAPI",
    name: SERVICE_NAME,
    description: desc,
    url: base,
    documentation: `${base}/llms.txt`,
    termsOfService: site,
    provider: { "@type": "Organization", name: SERVICE_NAME, url: site },
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta property="og:site_name" content="${SERVICE_NAME}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(base)}" />
  <meta name="theme-color" content="#0B1F1A" />
  <link rel="canonical" href="${escapeHtml(base)}" />
  <link rel="alternate" type="text/plain" href="/llms.txt" title="AgentKeep llms.txt" />
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font: 16px/1.5 ui-sans-serif, system-ui, sans-serif; background: #0B1F1A; color: #e7f2ec; }
    main { max-width: 52rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    a { color: #9ddec4; }
    h1 { font-size: 1.8rem; letter-spacing: -0.03em; margin-bottom: 0.25rem; }
    h2 { font-size: 1.05rem; margin-top: 2rem; }
    .lede { color: #c5ddd2; }
    .banner { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; align-items: center; padding: 0.85rem 1rem; border: 1px solid #1e4a3d; border-radius: 10px; background: #102820; }
    code, td code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.86em; }
    table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
    th, td { text-align: left; vertical-align: top; padding: 0.55rem 0.5rem; border-bottom: 1px solid #1e4a3d; }
    ol { padding-left: 1.2rem; }
  </style>
</head>
<body>
<main>
  <p class="banner"><span>This is the API.</span> <a href="${escapeHtml(site)}">Open the AgentKeep website</a></p>
  <h1>AgentKeep API</h1>
  <p class="lede">${escapeHtml(desc)}</p>
  <p>Canonical API: <a href="${escapeHtml(base)}"><code>${escapeHtml(base)}</code></a>. Facilitator: <a href="https://facilitator.goplausible.xyz">facilitator.goplausible.xyz</a>. Challenge tag <code>x402-global-challenge</code>. USDC ASA <code>${MAINNET_USDC_ASA}</code> on Algorand Mainnet.</p>
  <h2>What an agent gets</h2>
  <ul>
    <li>Memory scoped to the paying wallet, so the next run can resume without an account.</li>
    <li>A fetch that returns text from a public URL, and a short trust probe before paying another service.</li>
    <li>Receipts for what that wallet already spent, and an email approval step before an irreversible action.</li>
  </ul>
  <h2>How to call</h2>
  <ol>
    <li>Call a paid path below. No payment returns HTTP 402 and a <code>PAYMENT-REQUIRED</code> header.</li>
    <li>Pay the advertised USDC amount on Algorand Mainnet with any x402 client. GoPlausible pays the network fee.</li>
    <li>Retry the same request with <code>PAYMENT-SIGNATURE</code>. Keep <code>X-AgentKeep-Session</code> (15 minutes) for free memory and budget reads.</li>
  </ol>
  <p>Agents should read <a href="/llms.txt">llms.txt</a> first, then <a href="/.well-known/x402">/.well-known/x402</a> for live prices. Humans can browse the same list at <a href="/v1/discovery">/v1/discovery</a>.</p>
  <h2>Paid routes</h2>
  <table>
    <thead><tr><th>Method</th><th>Path</th><th>Price</th><th>What it returns</th></tr></thead>
    <tbody>
    ${rows}
    </tbody>
  </table>
  <h2>Read next</h2>
  <ul>
    <li><a href="${escapeHtml(site)}">Website</a></li>
    <li><a href="/llms.txt">llms.txt</a></li>
    <li><a href="/skill.md">skill.md</a></li>
    <li><a href="/agents.md">agents.md</a></li>
    <li><a href="/.well-known/x402">.well-known/x402</a></li>
    <li><a href="/.well-known/agent-card.json">agent-card.json</a></li>
    <li><a href="/v1/discovery">/v1/discovery</a></li>
    <li><a href="/health">/health</a></li>
  </ul>
</main>
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
    `> Website: ${siteUrl(config)}`,
    `> API base: ${base}`,
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
    `- ${base}/skill.md`,
    `- ${base}/agents.md`,
    `- ${base}/.well-known/x402`,
    `- ${base}/.well-known/agent-card.json`,
    `- ${base}/.well-known/agent.json`,
    `- ${base}/.well-known/ai-plugin.json`,
    `- ${base}/v1/discovery`,
    `- ${siteUrl(config)}/llms.txt`,
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

Website for humans: ${siteUrl(config)}
API base: ${base}

## Payment

Every route under \`/v1\` that is priced answers **HTTP 402** until paid with x402.

1. Read \`PAYMENT-REQUIRED\` (base64 JSON): \`resource\`, \`accepts[]\`, \`extensions.bazaar\`, \`extensions.x402-merchant\`.
2. Pay **Algorand Mainnet** USDC ASA \`${MAINNET_USDC_ASA}\` to \`payTo\` via GoPlausible (\`${MAINNET_CAIP2}\`).
3. Retry with \`PAYMENT-SIGNATURE\`. Store \`X-AgentKeep-Session\` for free GETs (15m).

Do **not** use Testnet for this deployment. Facilitator: https://facilitator.goplausible.xyz

## Endpoints

Live prices are in the HTTP 402 and in ${base}/.well-known/x402. This table is the current list.

${Object.entries(ROUTE_DISCOVERY)
  .map(([route, meta]) => {
    const path = route.includes(" ") ? route.split(/\s+/)[1]! : route;
    return `- ${meta.method} ${base}${path} — ${meta.description} Price now: ${priceLabel(meta.priceMinor)}.`;
  })
  .join("\n")}

Free after a settled call, with header \`X-AgentKeep-Session\` (15 minutes): \`GET ${base}/v1/memory/{key}\` and \`GET ${base}/v1/budget\`.

## When to use this

Use AgentKeep when the next run of the same wallet must remember a value, fetch text from a public URL, check that a URL responds before paying it, export what was spent, or stop for a human approve/deny email.

Do not use it for web search, company enrichment, LLM chat, or paying other APIs. Those are different services.

## Assumptions

- Always pay the amount in the live 402. This document can go stale.
- A session does not pay for a priced route. It only unlocks the free GETs above.
- On \`payment_invalid\`, \`payment_replay\`, or \`budget_exceeded\`, stop and escalate.
- Data belongs to the paying wallet. A different wallet reading the same key gets 404.

## Docs

- ${base}/llms.txt
- ${base}/skill.md
- ${base}/.well-known/x402
- ${base}/v1/discovery
- ${siteUrl(config)}
`;
}

/** Raw skill document agents fetch at /skill.md */
export function skillMd(config: AppConfig): string {
  const base = baseUrl(config);
  const site = siteUrl(config);
  return `# AgentKeep

Pay-per-call memory, fetch, receipts, trust, and human approval for wallet agents. No signup and no API key. Payment is x402 USDC on Algorand Mainnet through GoPlausible.

## Where

- Website: ${site}
- API: ${base}
- Prices and payment requirements: ${base}/.well-known/x402
- How to call: ${base}/llms.txt
- This file: ${base}/skill.md

## When to call

- Store or resume a value for the paying wallet between runs: PUT /v1/memory/{key}
- Read a public page as text before deciding: POST /v1/fetch
- Check that a URL responds before paying it elsewhere: GET /v1/trust?url=
- See what this wallet already spent: GET /v1/budget/receipts
- Ask the human owner to approve or deny: POST /v1/notify, then poll GET /v1/notify/{id}

## When not to call

Do not use AgentKeep for search, enrichment, chat, or image generation. Do not send Testnet payments to this API. Do not put seeds or passwords in memory or artifacts. Artifact URLs are public.

## How to pay

1. Call the path. HTTP 402 plus header PAYMENT-REQUIRED means you have not paid.
2. Pay the accepts[] entry: scheme exact, Algorand Mainnet USDC ASA ${MAINNET_USDC_ASA}, facilitator https://facilitator.goplausible.xyz. The facilitator pays the Algorand network fee.
3. Retry the same request with header PAYMENT-SIGNATURE.
4. Save response header X-AgentKeep-Session for 15 minutes. Use it on GET /v1/memory/{key} and GET /v1/budget.
5. On paid retries, send Idempotency-Key so a retry is not a second charge.

## Limits

- Default hard cap is $2 USDC per wallet per day. budget_exceeded means stop.
- Notify only delivers to a channel the owner already bound. Never supply a recipient address.
- Another wallet's key is a 404, not an empty value.
`;
}

/** ChatGPT-style plugin manifest. Points models at the live x402 catalog. */
export function aiPluginJson(config: AppConfig) {
  const base = baseUrl(config);
  const site = siteUrl(config);
  return {
    schema_version: "v1",
    name_for_human: SERVICE_NAME,
    name_for_model: "agentkeep",
    description_for_human:
      "Wallet memory, URL fetch, receipts, and human approval. Pay per call with USDC on Algorand.",
    description_for_model: `${SERVICE_BLURB} Read ${base}/llms.txt before calling. Unpaid requests return HTTP 402; pay the advertised Mainnet USDC requirement and retry with PAYMENT-SIGNATURE.`,
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: `${base}/.well-known/x402`,
      is_user_authenticated: false,
    },
    logo_url: `${site}/brand/logo-mark.svg`,
    legal_info_url: site,
  };
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
