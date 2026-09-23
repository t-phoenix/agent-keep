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
} from "@x402/avm";
import {
  ed25519SigningKeyFromWrappedSecret,
  type WrappedEd25519Seed,
} from "@algorandfoundation/algokit-utils/crypto";
import { seedFromMnemonic } from "@algorandfoundation/algokit-utils/algo25";

/** GoPlausible `/supported` uses full genesis-hash CAIP-2 (not the truncated constant). */
const ALGORAND_TESTNET_FULL = `algorand:${ALGORAND_TESTNET_GENESIS_HASH}`;

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
  "https://agent-keep-684642514120.europe-west1.run.app";

const url = `${base}/v1/memory/canary`;

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
  console.log(`Target: PUT ${url}`);

  const client = new x402Client();
  // Register both full-hash (GoPlausible) and truncated (@x402/avm) forms.
  const scheme = new ExactAvmScheme(avmSigner);
  client.register(ALGORAND_TESTNET_FULL, scheme);
  client.register(ALGORAND_TESTNET_CAIP2, scheme);
  console.log(`Registered networks: ${ALGORAND_TESTNET_FULL} + ${ALGORAND_TESTNET_CAIP2}`);
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  const response = await fetchWithPayment(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: { canary: true, at: new Date().toISOString() } }),
  });

  const session = response.headers.get("x-agentkeep-session");
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }

  if (response.ok) {
    const paymentResponse = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
      response.headers.get(name),
    );
    console.log("\nPayment settled:", JSON.stringify(paymentResponse, null, 2));
    console.log("Session:", session);
    console.log("Body:", JSON.stringify(body, null, 2));
    console.log("\nH1 canary OK — reply: H1 human done");
    return;
  }

  console.error(`\nFailed: HTTP ${response.status}`);
  console.error(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  process.exit(1);
}

main().catch((err: Error) => {
  console.error("Canary error:", err.message);
  process.exit(1);
});
