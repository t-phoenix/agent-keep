import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

/** Concrete Bazaar discovery metadata keyed by route template (docs/28). */
export const ROUTE_DISCOVERY: Record<
  string,
  {
    method: "GET" | "PUT" | "POST" | "DELETE";
    description: string;
    extensions: Record<string, unknown>;
  }
> = {
  "PUT /v1/memory/:key": {
    method: "PUT",
    description: "Store a wallet-scoped key/value (≤64KiB); returns metadata and payment receipt.",
    extensions: declareDiscoveryExtension({
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
    }),
  },
  "POST /v1/fetch": {
    method: "POST",
    description: "Server-side HTTP fetch of a public URL with SSRF protections; returns status and body excerpt.",
    extensions: declareDiscoveryExtension({
      input: { url: "https://example.com", method: "GET" },
      inputSchema: {
        properties: {
          url: { type: "string", format: "uri" },
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
  "GET /v1/budget/receipts": {
    method: "GET",
    description: "Export recent settled/credited ledger rows for the paying wallet.",
    extensions: declareDiscoveryExtension({
      output: {
        example: {
          receipts: [{ receipt_id: "rcpt_…", route: "PUT /v1/memory/plan", status: "settled" }],
        },
      },
    }),
  },
  "GET /v1/trust": {
    method: "GET",
    description: "Probe a URL for reachability and basic x402/payment signals (≤3s).",
    extensions: declareDiscoveryExtension({
      input: { url: "https://example.com" },
      inputSchema: {
        properties: { url: { type: "string", format: "uri" } },
        required: ["url"],
      },
      output: {
        example: { reachable: true, status: 200, hints: [] },
      },
    }),
  },
  "POST /v1/notify": {
    method: "POST",
    description: "Create an owner-bound approval/Q&A ticket; returns pending ticket id for polling.",
    extensions: declareDiscoveryExtension({
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
};

export function discoveryForRoute(route: string): Record<string, unknown> | undefined {
  // Exact match first
  if (ROUTE_DISCOVERY[route]) return ROUTE_DISCOVERY[route]!.extensions as Record<string, unknown>;
  // Template match: PUT /v1/memory/foo → PUT /v1/memory/:key
  for (const [template, meta] of Object.entries(ROUTE_DISCOVERY)) {
    const [verb, path] = template.split(/\s+/);
    const [rVerb, rPath] = route.split(/\s+/);
    if (verb !== rVerb || !path || !rPath) continue;
    const re = new RegExp("^" + path.replace(/:[^/]+/g, "[^/]+") + "$");
    if (re.test(rPath)) return meta.extensions as Record<string, unknown>;
  }
  return undefined;
}

/** Public catalog for agents / Bazaar crawlers. */
export function discoveryCatalog(publicBase: string) {
  const base = publicBase.replace(/\/$/, "");
  return {
    service: "AgentKeep",
    protocol: "x402",
    facilitator: "goplausible",
    tag: "x402-global-challenge",
    base_url: base,
    routes: Object.entries(ROUTE_DISCOVERY).map(([route, meta]) => ({
      route,
      method: meta.method,
      description: meta.description,
      url_template: `${base}${route.includes(" ") ? route.split(/\s+/)[1] : route}`,
    })),
  };
}
