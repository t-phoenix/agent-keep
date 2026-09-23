/**
 * Create a local Testnet canary wallet (AlgoKit-compatible mnemonic).
 * Writes gitignored `.algorand/canary-wallet.json` and upserts `.env` keys.
 *
 *   pnpm --filter @agentkeep/api wallet:create
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mnemonicFromSeed } from "@algorandfoundation/algokit-utils/algo25";
import {
  ed25519SigningKeyFromWrappedSecret,
  type WrappedEd25519Seed,
} from "@algorandfoundation/algokit-utils/crypto";
import { toClientAvmSigner } from "@x402/avm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const walletDir = resolve(repoRoot, ".algorand");
const walletPath = resolve(walletDir, "canary-wallet.json");
const envPath = resolve(repoRoot, ".env");

async function secretKeyFromMnemonic(mnemonic: string): Promise<string> {
  const { seedFromMnemonic } = await import("@algorandfoundation/algokit-utils/algo25");
  const seed = seedFromMnemonic(mnemonic);
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

function upsertEnv(key: string, value: string) {
  let text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) text = text.replace(re, line);
  else text = `${text.trimEnd()}\n\n# Local AlgoKit canary wallet (gitignored .algorand/)\n${line}\n`;
  writeFileSync(envPath, text.endsWith("\n") ? text : `${text}\n`);
}

async function main() {
  const force = process.argv.includes("--force");
  if (existsSync(walletPath) && !force) {
    const existing = JSON.parse(readFileSync(walletPath, "utf8")) as {
      address: string;
      network: string;
    };
    console.log(`Wallet already exists at ${walletPath}`);
    console.log(`Address: ${existing.address}`);
    console.log(`Network: ${existing.network}`);
    console.log(`Re-run with --force to rotate (you'll need to re-fund).`);
    process.exit(0);
  }

  const seed = randomBytes(32);
  const mnemonic = mnemonicFromSeed(seed);
  const secretKey = await secretKeyFromMnemonic(mnemonic);
  const signer = toClientAvmSigner(secretKey);
  const address = signer.address;

  mkdirSync(walletDir, { recursive: true, mode: 0o700 });
  const payload = {
    network: "testnet",
    address,
    mnemonic,
    createdAt: new Date().toISOString(),
    note: "Local canary payer only — never commit. Fund ALGO + opt-in USDC 10458941.",
  };
  writeFileSync(walletPath, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });

  upsertEnv("AVM_MNEMONIC", `"${mnemonic}"`);
  upsertEnv("CANARY_ADDRESS", address);
  upsertEnv("CANARY_NETWORK", "testnet");

  console.log("\nCreated local Testnet canary wallet");
  console.log(`  file:    ${walletPath}`);
  console.log(`  address: ${address}`);
  console.log(`  .env:    AVM_MNEMONIC + CANARY_ADDRESS updated`);
  console.log(`
Next — fund + opt-in (you do this):

1) Fund Testnet ALGO (web, easiest):
   https://bank.testnet.algorand.network/
   Paste: ${address}

   Or with AlgoKit CLI (after 'algokit dispenser login'):
   algokit dispenser fund -r ${address} -a 10 --whole-units

2) Register alias (optional, interactive mnemonic prompt):
   algokit task wallet add agentkeep-canary -a ${address} -m

3) Opt-in Testnet USDC ASA 10458941:
   algokit task opt-in -a agentkeep-canary -n testnet 10458941
   # or: pnpm --filter @agentkeep/api wallet:optin

4) Send a little Testnet USDC to this address (from Pera address2 or a faucet).

5) Run canary:
   pnpm --filter @agentkeep/api canary
`);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
