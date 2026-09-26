/**
 * Local Testnet canary — pays AgentKeep with Pera account mnemonic via x402.
 *
 * NEVER commit your mnemonic. Add to gitignored `.env`:
 *   AVM_MNEMONIC="word1 word2 ... word25"
 *
 * Use the **payer** (address2) recovery phrase — not the payTo merchant wallet.
 *
 * Run from repo root:
 *   pnpm --filter @agentkeep/api canary
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import {
  toClientAvmSigner,
  ExactAvmScheme,
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_TESTNET_GENESIS_HASH,
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_MAINNET_GENESIS_HASH,
} from "@x402/avm";
import {
  ed25519SigningKeyFromWrappedSecret,
  type WrappedEd25519Seed,
} from "@algorandfoundation/algokit-utils/crypto";
import { seedFromMnemonic } from "@algorandfoundation/algokit-utils/algo25";

/** GoPlausible `/supported` uses full genesis-hash CAIP-2 (not the truncated constant). */
const ALGORAND_TESTNET_FULL = `algorand:${ALGORAND_TESTNET_GENESIS_HASH}`;
const ALGORAND_MAINNET_FULL = `algorand:${ALGORAND_MAINNET_GENESIS_HASH}`;

function loadDotEnv() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      const hash = v.search(/\s+#/);
      if (hash >= 0) v = v.slice(0, hash).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
    console.log(`Loaded env from ${path}`);
    return;
  }
}

loadDotEnv();

function loadCanaryWalletMnemonic(): string | undefined {
  const walletPath = resolve(process.cwd(), "../../.algorand/canary-wallet.json");
  const alt = resolve(process.cwd(), ".algorand/canary-wallet.json");
  for (const path of [walletPath, alt]) {
    if (!existsSync(path)) continue;
    try {
      const w = JSON.parse(readFileSync(path, "utf8")) as { mnemonic?: string; address?: string };
      if (w.mnemonic) {
        console.log(`Using local wallet ${path}${w.address ? ` (${w.address})` : ""}`);
        return w.mnemonic;
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

const mnemonic = (process.env.AVM_MNEMONIC?.trim() || loadCanaryWalletMnemonic())?.trim();
if (!mnemonic) {
  console.error(`
No canary wallet found.

Create a local Testnet wallet (recommended — no Pera export):

  pnpm --filter @agentkeep/api wallet:create

Then fund ALGO + opt-in USDC (see script output), and re-run canary.

Or set AVM_MNEMONIC in .env (gitignored) to a Testnet payer phrase.
`);
  process.exit(1);
}

const base =
  process.env.CANARY_BASE_URL?.replace(/\/$/, "") ||
  process.env.PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://api.agentkeep.online";

const memoryKey = (process.env.CANARY_MEMORY_KEY || "canary").replace(/^\/+/, "");
/** Comma list: memory,fetch,receipts,trust,artifacts (default: memory) */
const routes = (process.env.CANARY_ROUTES || "memory")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

type PaidCall = {
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
};

function buildCalls(): PaidCall[] {
  const out: PaidCall[] = [];
  for (const r of routes) {
    if (r === "memory") {
      out.push({
        name: `PUT /v1/memory/${memoryKey}`,
        method: "PUT",
        url: `${base}/v1/memory/${memoryKey}`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: { canary: true, at: new Date().toISOString() } }),
      });
    } else if (r === "memory-list") {
      out.push({
        name: "GET /v1/memory",
        method: "GET",
        url: `${base}/v1/memory`,
      });
    } else if (r === "memory-delete") {
      out.push({
        name: `DELETE /v1/memory/${memoryKey}`,
        method: "DELETE",
        url: `${base}/v1/memory/${memoryKey}`,
      });
    } else if (r === "fetch") {
      out.push({
        name: "POST /v1/fetch",
        method: "POST",
        url: `${base}/v1/fetch`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://example.com", max_bytes: 2048 }),
      });
    } else if (r === "receipts") {
      out.push({
        name: "GET /v1/budget/receipts",
        method: "GET",
        url: `${base}/v1/budget/receipts`,
      });
    } else if (r === "trust") {
      out.push({
        name: "GET /v1/trust",
        method: "GET",
        url: `${base}/v1/trust?url=${encodeURIComponent("https://example.com")}`,
      });
    } else if (r === "artifacts") {
      out.push({
        name: "POST /v1/artifacts",
        method: "POST",
        url: `${base}/v1/artifacts`,
        headers: { "content-type": "text/plain" },
        body: `canary-artifact ${new Date().toISOString()}`,
      });
    } else if (r === "bind-email" || r === "bind") {
      const email = (process.env.CANARY_OWNER_EMAIL || "").trim();
      if (!email) {
        console.error("bind-email requires CANARY_OWNER_EMAIL=you@example.com");
        process.exit(1);
      }
      out.push({
        name: "POST /v1/owner/bind/email",
        method: "POST",
        url: `${base}/v1/owner/bind/email`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } else if (r === "notify") {
      out.push({
        name: "POST /v1/notify",
        method: "POST",
        url: `${base}/v1/notify`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question:
            process.env.CANARY_NOTIFY_QUESTION ||
            `AgentKeep canary notify at ${new Date().toISOString()} — Approve?`,
        }),
      });
    } else {
      console.warn(`Unknown CANARY_ROUTES entry skipped: ${r}`);
    }
  }
  return out;
}

async function getSecretKeyFromMnemonic(avmMnemonic: string): Promise<string> {
  const seed = seedFromMnemonic(avmMnemonic);
  const seedCopy = new Uint8Array(seed);
  const wrappedSeed: WrappedEd25519Seed = {
    unwrapEd25519Seed: async () => seed,
    wrapEd25519Seed: async () => {},
  };
  const wrappedSecret = await ed25519SigningKeyFromWrappedSecret(wrappedSeed);
  return Buffer.concat([
    Buffer.from(seedCopy),
    Buffer.from(wrappedSecret.ed25519Pubkey),
  ]).toString("base64");
}

async function main() {
  const secretKey = await getSecretKeyFromMnemonic(mnemonic!);
  const avmSigner = toClientAvmSigner(secretKey);
  console.log(`Payer address: ${avmSigner.address}`);

  const client = new x402Client();
  const scheme = new ExactAvmScheme(avmSigner);
  const networkHint = (
    process.env.CANARY_NETWORK ||
    process.env.PAYMENT_MODE ||
    "testnet"
  ).toLowerCase();
  const isMainnet = networkHint === "mainnet";
  if (isMainnet) {
    client.register(ALGORAND_MAINNET_FULL, scheme);
    client.register(ALGORAND_MAINNET_CAIP2, scheme);
    console.log(`Registered networks: ${ALGORAND_MAINNET_FULL} + ${ALGORAND_MAINNET_CAIP2}`);
  } else {
    client.register(ALGORAND_TESTNET_FULL, scheme);
    client.register(ALGORAND_TESTNET_CAIP2, scheme);
    console.log(`Registered networks: ${ALGORAND_TESTNET_FULL} + ${ALGORAND_TESTNET_CAIP2}`);
  }
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const calls = buildCalls();
  if (calls.length === 0) {
    console.error("No canary routes selected. Set CANARY_ROUTES=memory,fetch,...");
    process.exit(1);
  }

  for (const call of calls) {
    console.log(`\n→ ${call.method} ${call.url}`);
    const response = await fetchWithPayment(call.url, {
      method: call.method,
      headers: call.headers,
      body: call.body,
    });

    const session = response.headers.get("x-agentkeep-session");
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep text */
    }

    if (!response.ok) {
      console.error(`\nFailed ${call.name}: HTTP ${response.status}`);
      console.error(typeof body === "string" ? body : JSON.stringify(body, null, 2));
      process.exit(1);
    }

    let paymentResponse: unknown;
    try {
      paymentResponse = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
        response.headers.get(name),
      );
    } catch (e) {
      paymentResponse = {
        note: "PAYMENT-RESPONSE header missing; AgentKeep session/receipt still valid",
        error: e instanceof Error ? e.message : String(e),
      };
    }
    console.log("Payment settled:", JSON.stringify(paymentResponse, null, 2));
    console.log("Session:", session);
    console.log("Body:", JSON.stringify(body, null, 2));
    console.log(`OK ${call.name}`);
  }

  console.log(`\nCanary OK (${isMainnet ? "Mainnet" : "Testnet"}) — ${calls.length} route(s)`);
}

main().catch((err: Error) => {
  console.error("Canary error:", err.message);
  process.exit(1);
});
