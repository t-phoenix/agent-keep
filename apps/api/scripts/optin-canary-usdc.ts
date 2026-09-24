/**
 * Opt the local canary wallet into USDC (Testnet 10458941 or Mainnet 31566704).
 *
 *   CANARY_NETWORK=mainnet pnpm --filter @agentkeep/api wallet:optin
 *   CANARY_NETWORK=testnet pnpm --filter @agentkeep/api wallet:optin
 *
 * Requires the wallet to already hold ALGO on that network for fees.
 * Does NOT opt-in the merchant payTo — do that in Pera with the payTo key.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const walletPath = resolve(repoRoot, ".algorand/canary-wallet.json");
const USDC_TESTNET = 10458941n;
const USDC_MAINNET = 31566704n;

function loadDotEnv() {
  const envPath = resolve(repoRoot, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
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
}

async function main() {
  loadDotEnv();
  if (!existsSync(walletPath)) {
    console.error("No wallet. Run: pnpm --filter @agentkeep/api wallet:create");
    process.exit(1);
  }
  const wallet = JSON.parse(readFileSync(walletPath, "utf8")) as {
    address: string;
    mnemonic: string;
  };

  const network = (process.env.CANARY_NETWORK || process.env.PAYMENT_MODE || "testnet").toLowerCase();
  const isMainnet = network === "mainnet";
  const asa = isMainnet ? USDC_MAINNET : USDC_TESTNET;
  const algorand = isMainnet ? AlgorandClient.mainNet() : AlgorandClient.testNet();
  const account = algorand.account.fromMnemonic(wallet.mnemonic);
  const address = String(account.addr ?? account.address ?? wallet.address);
  const explorer = isMainnet
    ? `https://explorer.perawallet.app/address/${wallet.address}`
    : `https://testnet.explorer.perawallet.app/address/${wallet.address}`;

  console.log(`Opting in ${address} to ASA ${asa} on ${isMainnet ? "MainNet" : "TestNet"}…`);

  const result = await algorand.send.assetOptIn({
    sender: account,
    assetId: asa,
  });

  const txId =
    (result as { txIds?: string[] }).txIds?.[0] ??
    (result as { transaction?: { txID?: () => string } }).transaction?.txID?.() ??
    "(check explorer)";

  console.log("Opt-in submitted.");
  console.log(`  txId: ${txId}`);
  console.log(`  ${explorer}`);
  console.log(
    `\nNext: send ${isMainnet ? "Mainnet" : "Testnet"} USDC to this address, then: pnpm --filter @agentkeep/api canary`,
  );
}

main().catch((e: Error) => {
  console.error("Opt-in failed:", e.message);
  console.error("Ensure the address has ALGO on the target network first.");
  process.exit(1);
});
