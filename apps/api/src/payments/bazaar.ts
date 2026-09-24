import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import {
  ALGORAND_MAINNET_GENESIS_HASH,
  USDC_MAINNET_ASA_ID,
} from "@x402/avm";
import type { AppConfig } from "../config.js";
import { ROUTE_PRICES_MINOR } from "../lib/money.js";
import { wireCaip2, wireUsdcAsa } from "./live-adapter.js";

/** Challenge / production discovery is Algorand Mainnet only (GoPlausible + Bazaar). */
export const MAINNET_CAIP2 = `algorand:${ALGORAND_MAINNET_GENESIS_HASH}`;
export const MAINNET_USDC_ASA = USDC_MAINNET_ASA_ID;

type RouteMeta = {
  method: "GET" | "PUT" | "POST" | "DELETE";
  description: string;
  /** Path template for Bazaar (e.g. `/v1/memory/:key`) when the URL has params. */
  routeTemplate?: string;
  priceMinor: number;
  extensions: Record<string, unknown>;
};

/**
 * Official middleware enriches bazaar with `info.input.method` at request time.
 * Our custom adapter must set `method` (and optional routeTemplate) up front —
 * otherwise GoPlausible `validateDiscoveryExtension` rejects the payload and
 * the settle never catalogs the resource.
 */
function bazaarExt(
  method: "GET" | "PUT" | "POST" | "DELETE" | "HEAD" | "PATCH",
  config: Parameters<typeof declareDiscoveryExtension>[0],
  opts?: {
    routeTemplate?: string;
    pathParams?: Record<string, string>;
    pathParamsSchema?: Record<string, unknown>;
  },
): Record<string, unknown> {
  const declared = declareDiscoveryExtension({
    ...(config as object),
    method,
    ...(opts?.pathParams ? { pathParams: opts.pathParams } : {}),
    ...(opts?.pathParamsSchema ? { pathParamsSchema: opts.pathParamsSchema } : {}),
  } as unknown as Parameters<typeof declareDiscoveryExtension>[0]);
  const bazaar = { ...(declared.bazaar as unknown as Record<string, unknown>) };
  if (opts?.routeTemplate) bazaar.routeTemplate = opts.routeTemplate;
  return { bazaar };
}

/** Concrete Bazaar discovery metadata keyed by route template (docs/28). */
export const ROUTE_DISCOVERY: Record<string, RouteMeta> = {
  "PUT /v1/memory/:key": {
    method: "PUT",
    description:
      "Store a wallet-scoped key/value (≤64KiB JSON/text). Returns key metadata plus an x402 payment receipt. Tenant = paying Algorand wallet; other wallets get 404.",
    routeTemplate: "/v1/memory/:key",
    priceMinor: ROUTE_PRICES_MINOR["PUT /v1/memory/:key"],
    extensions: bazaarExt(
      "PUT",
      {
        input: { value: { note: "hello" }, content_type: "application/json" },
        inputSchema: {
          properties: {
            value: {},
            content_type: { type: "string" },
          },
          required: ["value"],
        },
        bodyType: "json",
        output: {
          example: {
            key: "plan",
            updated_at: "2026-09-24T00:00:00.000Z",
            expires_at: "2026-10-01T00:00:00.000Z",
            receipt: { receipt_id: "rcpt_…", status: "settled" },
          },
        },
      },
      {
        routeTemplate: "/v1/memory/:key",
        pathParams: { key: "plan" },
        pathParamsSchema: { properties: { key: { type: "string" } } },
      },
    ),
  },
  "POST /v1/fetch": {
    method: "POST",
    description:
      "Server-side HTTPS fetch of a public URL with shared SSRF denylist (no private/link-local). Returns status, content-type, and a truncated body excerpt plus payment receipt.",
    priceMinor: ROUTE_PRICES_MINOR["POST /v1/fetch"],
    extensions: bazaarExt("POST", {
      input: { url: "https://example.com", method: "GET" },
      inputSchema: {
        properties: {
          url: { type: "string" },
          method: { type: "string" },
        },
        required: ["url"],
      },
      bodyType: "json",
      output: {
        example: { status: 200, content_type: "text/html", body_preview: "<!doctype html>…" },
      },
    }),
  },
  "DELETE /v1/memory/:key": {
    method: "DELETE",
    description:
      "Delete a wallet-scoped memory key. Returns deleted=true plus payment receipt. Cross-wallet keys are not found (404).",
    routeTemplate: "/v1/memory/:key",
    priceMinor: ROUTE_PRICES_MINOR["DELETE /v1/memory/:key"],
    extensions: bazaarExt(
      "DELETE",
      {
        output: { example: { deleted: true } },
      },
      {
        routeTemplate: "/v1/memory/:key",
        pathParams: { key: "plan" },
        pathParamsSchema: { properties: { key: { type: "string" } } },
      },
    ),
  },
  "GET /v1/memory": {
    method: "GET",
    description:
      "List memory keys (no values) for the paying wallet. Paginated metadata only.",
    priceMinor: ROUTE_PRICES_MINOR["GET /v1/memory"],
    extensions: bazaarExt("GET", {
      output: {
        example: { keys: [{ key: "plan", updated_at: "2026-09-24T00:00:00.000Z" }] },
      },
    }),
  },
  "POST /v1/artifacts": {
    method: "POST",
    description:
      "Upload bytes (≤10MiB; no HTML/JS). Returns a public HTTPS URL + sha256 and payment receipt. Stored on R2 when configured.",
    priceMinor: ROUTE_PRICES_MINOR["POST /v1/artifacts"],
    extensions: bazaarExt("POST", {
      input: { note: "raw body bytes; Content-Type required" },
      bodyType: "json",
      output: {
        example: {
          id: "a1b2…",
          url: "https://api.example/a/a1b2…",
          sha256: "…",
          bytes: 12,
        },
      },
    }),
  },
  "GET /v1/budget/receipts": {
    method: "GET",
    description:
      "Export recent ledger rows (settled|credited|failed) for the paying wallet — spend audit for agents.",
    priceMinor: ROUTE_PRICES_MINOR["GET /v1/budget/receipts"],
    extensions: bazaarExt("GET", {
      output: {
        example: {
          receipts: [{ receipt_id: "rcpt_…", route: "PUT /v1/memory/plan", status: "settled" }],
        },
      },
    }),
  },
  "GET /v1/trust": {
    method: "GET",
    description:
      "Probe a public URL for reachability and basic x402 Payment-Required signals (≤3s). SSRF-guarded.",
    priceMinor: ROUTE_PRICES_MINOR["GET /v1/trust"],
    extensions: bazaarExt("GET", {
      input: { url: "https://example.com" },
      inputSchema: {
        properties: { url: { type: "string" } },
        required: ["url"],
      },
      output: {
        example: { reachable: true, status: 200, hints: [] },
      },
    }),
  },
  "POST /v1/notify": {
    method: "POST",
    description:
      "Create an owner-bound human approval/Q&A ticket (email/Telegram already bound by owner). Returns pending ticket id — poll GET /v1/notify/{id}; never blocks on max_wait_seconds.",
    priceMinor: ROUTE_PRICES_MINOR["POST /v1/notify"],
    extensions: bazaarExt("POST", {
      input: { question: "Approve $0.05 fetch?" },
      inputSchema: {
        properties: { question: { type: "string" } },
        required: ["question"],
      },
      bodyType: "json",
      output: {
        example: { id: "ntf_…", status: "pending" },
      },
    }),
  },
  "GET /v1/notify/:id": {
    method: "GET",
    description:
      "Poll an owner-bound notify ticket until terminal status (approved|denied|answered|timeout|cancelled).",
    routeTemplate: "/v1/notify/:id",
    priceMinor: ROUTE_PRICES_MINOR["GET /v1/notify/:id"],
    extensions: bazaarExt(
      "GET",
      {
        output: {
          example: { id: "ntf_…", status: "pending", question: "Approve?" },
        },
      },
      {
        routeTemplate: "/v1/notify/:id",
        pathParams: { id: "ntf_example" },
        pathParamsSchema: { properties: { id: { type: "string" } } },
      },
    ),
  },
  "POST /v1/owner/bind/email": {
    method: "POST",
    description:
      "Bind an owner email for notify tickets. Body: { email }. Sends Approve/Deny links to this address on later POST /v1/notify.",
    priceMinor: ROUTE_PRICES_MINOR["POST /v1/owner/bind/email"],
    extensions: bazaarExt("POST", {
      input: { email: "owner@example.com" },
      inputSchema: {
        properties: { email: { type: "string" } },
        required: ["email"],
      },
      bodyType: "json",
      output: {
        example: { status: "bound", email: "owner@example.com" },
      },
    }),
  },
};

const MERCHANT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    website: { type: "string" },
    categories: { type: "array", items: { type: "string" } },
  },
} as const;

/** x402-merchant identity for Bazaar (no logo/images). */
export function merchantExtension(config: AppConfig): Record<string, unknown> {
  const website = (config.publicApiBase || "").replace(/\/$/, "") || "https://agent-keep-3jimn6j2va-ew.a.run.app";
  return {
    "x402-merchant": {
      info: {
        name: "AgentKeep",
        website,
        categories: [
          "api",
          "algorand",
          "x402",
          "agent-os",
          "memory",
          "fetch",
          "budget",
          "notify",
        ],
      },
      schema: MERCHANT_SCHEMA,
    },
  };
}

function matchRoute(route: string): RouteMeta | undefined {
  if (ROUTE_DISCOVERY[route]) return ROUTE_DISCOVERY[route];
  for (const [template, meta] of Object.entries(ROUTE_DISCOVERY)) {
    const [verb, path] = template.split(/\s+/);
    const [rVerb, rPath] = route.split(/\s+/);
    if (verb !== rVerb || !path || !rPath) continue;
    const re = new RegExp("^" + path.replace(/:[^/]+/g, "[^/]+") + "$");
    if (re.test(rPath)) return meta;
  }
  return undefined;
}

/** Bazaar + merchant extensions for a paid route (Mainnet challenge). */
export function discoveryForRoute(
  route: string,
  config?: AppConfig,
): Record<string, unknown> | undefined {
  const meta = matchRoute(route);
  if (!meta) return config ? merchantExtension(config) : undefined;
  return {
    ...meta.extensions,
    ...(config ? merchantExtension(config) : {}),
  };
}

export function descriptionForRoute(route: string, fallback = "Paid AgentKeep route"): string {
  return matchRoute(route)?.description ?? fallback;
}

/**
 * Official GoPlausible `/.well-known/x402` shape — Mainnet USDC only.
 * Facilitator enrichment + agents use this for prices before paying.
 */
export function wellKnownX402(config: AppConfig) {
  const base = config.publicApiBase.replace(/\/$/, "");
  const network =
    config.payment.mode === "mainnet" ? MAINNET_CAIP2 : wireCaip2(config);
  const asset =
    config.payment.mode === "mainnet" ? MAINNET_USDC_ASA : wireUsdcAsa(config);
  const payTo = config.payment.payTo;

  return {
    x402Version: 2,
    name: "AgentKeep",
    description:
      "Wallet-scoped agent OS primitives over x402: memory, fetch, budget receipts, trust probes, and owner-bound notify. No signup — pay per call in USDC on Algorand Mainnet via GoPlausible. Challenge tag: x402-global-challenge.",
    resources: Object.entries(ROUTE_DISCOVERY).map(([route, meta]) => {
      const path = route.includes(" ") ? route.split(/\s+/)[1]! : route;
      return {
        url: `${base}${path}`,
        method: meta.method,
        description: meta.description,
        network,
        asset: String(asset),
        amount: String(meta.priceMinor),
        payTo,
        extra: {
          tag: config.payment.challengeTag,
          route,
        },
      };
    }),
  };
}

/** Agent-oriented catalog (also useful for humans). */
export function discoveryCatalog(config: AppConfig) {
  const base = config.publicApiBase.replace(/\/$/, "");
  const x402 = wellKnownX402(config);
  return {
    service: "AgentKeep",
    name: "AgentKeep",
    description: x402.description,
    protocol: "x402",
    facilitator: "https://facilitator.goplausible.xyz",
    tag: config.payment.challengeTag,
    network: "algorand-mainnet",
    network_caip2: MAINNET_CAIP2,
    asset: "USDC",
    asa_id: MAINNET_USDC_ASA,
    payTo: config.payment.payTo,
    base_url: base,
    docs: {
      llms_txt: `${base}/llms.txt`,
      agents_md: `${base}/agents.md`,
      agent_card: `${base}/.well-known/agent-card.json`,
      x402: `${base}/.well-known/x402`,
      health: `${base}/health`,
    },
    how_to_pay: {
      steps: [
        "Call a paid route without payment → HTTP 402 + PAYMENT-REQUIRED (base64 JSON).",
        "Pay the advertised requirement in USDC on Algorand Mainnet (ASA 31566704) via an x402 client; GoPlausible is the facilitator (gasless for buyer fees).",
        "Retry the same request with PAYMENT-SIGNATURE; on success read X-AgentKeep-Session (15m TTL) for free Memory/Budget GETs.",
        "Branch on error.code from the error catalog; never invent codes.",
      ],
      challenge_tag: config.payment.challengeTag,
      session_header: "X-AgentKeep-Session",
      idempotency_header: "Idempotency-Key",
    },
    resources: x402.resources,
    routes: Object.entries(ROUTE_DISCOVERY).map(([route, meta]) => ({
      route,
      method: meta.method,
      description: meta.description,
      price_usdc_minor: meta.priceMinor,
      url_template: `${base}${route.includes(" ") ? route.split(/\s+/)[1] : route}`,
    })),
  };
}
