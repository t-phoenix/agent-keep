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
import { toClientAvmSigner, ExactAvmScheme, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";
import {
  ed25519SigningKeyFromWrappedSecret,
  type WrappedEd25519Seed,
} from "@algorandfoundation/algokit-utils/crypto";
import { seedFromMnemonic } from "@algorandfoundation/algokit-utils/algo25";

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

const mnemonic = process.env.AVM_MNEMONIC?.trim();
if (!mnemonic) {
  console.error(`
Missing AVM_MNEMONIC.

1. Open Pera Wallet (TestNet) → the **payer** account (address2), not payTo.
2. Settings → Show Passphrase / Recovery phrase (write it down offline).
3. Add ONE line to repo-root .env (gitignored):

   AVM_MNEMONIC="your twenty five words here"

4. Re-run: pnpm --filter @agentkeep/api canary

Do NOT paste the mnemonic into chat or commit it.
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
  client.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(avmSigner));
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
