/**
 * One Mainnet demo: store a PNG artifact, save its URL in wallet memory, print both.
 * Reads AVM_MNEMONIC from the repo .env. Never prints the mnemonic.
 *
 *   CANARY_BASE_URL=https://api.agentkeep.online \
 *   pnpm --filter @agentkeep/api exec tsx scripts/demo-image.ts \
 *     ../../apps/web/public/brand/logo.png
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import {
  toClientAvmSigner,
  ExactAvmScheme,
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_MAINNET_GENESIS_HASH,
} from "@x402/avm";
import {
  ed25519SigningKeyFromWrappedSecret,
  type WrappedEd25519Seed,
} from "@algorandfoundation/algokit-utils/crypto";
import { seedFromMnemonic } from "@algorandfoundation/algokit-utils/algo25";

function loadDotEnv() {
  for (const path of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
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
    return;
  }
}

loadDotEnv();

const mnemonic = process.env.AVM_MNEMONIC?.trim();
const filePath = resolve(process.argv[2] || "../../apps/web/public/brand/logo.png");
const base = (process.env.CANARY_BASE_URL || "https://api.agentkeep.online").replace(/\/$/, "");
const memoryKey = process.env.CANARY_MEMORY_KEY || "task:grant:logo";
if (!mnemonic) {
  console.error("AVM_MNEMONIC missing");
  process.exit(1);
}
if (!existsSync(filePath)) {
  console.error(`Image not found: ${filePath}`);
  process.exit(1);
}

async function secretKey(avmMnemonic: string): Promise<string> {
  const seed = seedFromMnemonic(avmMnemonic);
  const seedCopy = new Uint8Array(seed);
  const wrappedSeed: WrappedEd25519Seed = {
    unwrapEd25519Seed: async () => seed,
    wrapEd25519Seed: async () => {},
  };
  const wrappedSecret = await ed25519SigningKeyFromWrappedSecret(wrappedSeed);
  return Buffer.concat([Buffer.from(seedCopy), Buffer.from(wrappedSecret.ed25519Pubkey)]).toString(
    "base64",
  );
}

async function main() {
  const png = readFileSync(filePath);
  const signer = toClientAvmSigner(await secretKey(mnemonic!));
  const client = new x402Client();
  const scheme = new ExactAvmScheme(signer);
  const full = `algorand:${ALGORAND_MAINNET_GENESIS_HASH}`;
  client.register(full, scheme);
  client.register(ALGORAND_MAINNET_CAIP2, scheme);
  const pay = wrapFetchWithPayment(fetch, client);
  const http = new x402HTTPClient(client);

  const uploaded = await pay(`${base}/v1/artifacts`, {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: png,
  });
  const uploadText = await uploaded.text();
  if (!uploaded.ok) {
    console.error(uploaded.status, uploadText);
    process.exit(1);
  }
  const uploadJson = JSON.parse(uploadText) as { url: string; id: string; sha256: string; bytes: number };
  const session = uploaded.headers.get("x-agentkeep-session") || "";
  const settled = http.getPaymentSettleResponse((name) => uploaded.headers.get(name));

  const note = await pay(`${base}/v1/memory/${memoryKey}?ttl_seconds=2592000`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      value: { kind: "image", url: uploadJson.url, sha256: uploadJson.sha256 },
    }),
  });
  const noteText = await note.text();
  if (!note.ok) {
    console.error(note.status, noteText);
    process.exit(1);
  }
  const noteSession = note.headers.get("x-agentkeep-session") || session;

  const readBack = await fetch(`${base}/v1/memory/${memoryKey}`, {
    headers: { "x-agentkeep-session": noteSession },
  });
  const readJson = await readBack.json();
  const file = await fetch(uploadJson.url);
  const got = Buffer.from(await file.arrayBuffer());

  console.log(JSON.stringify({
    payer: signer.address,
    artifact_tx: (settled as { transaction?: string }).transaction,
    artifact_url: uploadJson.url,
    bytes: uploadJson.bytes,
    sha256: uploadJson.sha256,
    public_get_status: file.status,
    public_get_type: file.headers.get("content-type"),
    bytes_match: got.equals(png),
    memory_key: memoryKey,
    memory_get_status: readBack.status,
    memory_url: (readJson as { value?: { url?: string } }).value?.url,
    session_exp_ms: JSON.parse(Buffer.from(noteSession.split(".")[0], "base64url").toString()).exp,
  }, null, 2));
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
