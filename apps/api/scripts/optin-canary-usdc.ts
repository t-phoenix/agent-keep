/**
 * Opt the local canary wallet into Testnet USDC ASA 10458941.
 *
 *   pnpm --filter @agentkeep/api wallet:optin
 *
 * Requires the wallet to already hold a bit of Testnet ALGO for fees.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const walletPath = resolve(repoRoot, ".algorand/canary-wallet.json");
const USDC_TESTNET = 10458941n;

async function main() {
  if (!existsSync(walletPath)) {
    console.error("No wallet. Run: pnpm --filter @agentkeep/api wallet:create");
    process.exit(1);
  }
  const wallet = JSON.parse(readFileSync(walletPath, "utf8")) as {
    address: string;
    mnemonic: string;
  };

  const algorand = AlgorandClient.testNet();
  const account = algorand.account.fromMnemonic(wallet.mnemonic);
  const address = String(account.addr ?? account.address ?? wallet.address);

  console.log(`Opting in ${address} to ASA ${USDC_TESTNET} on TestNet…`);

  const result = await algorand.send.assetOptIn({
    sender: account,
    assetId: USDC_TESTNET,
  });

  const txId =
    (result as { txIds?: string[] }).txIds?.[0] ??
    (result as { transaction?: { txID?: () => string } }).transaction?.txID?.() ??
    "(check explorer)";

  console.log("Opt-in submitted.");
  console.log(`  txId: ${txId}`);
  console.log(`  https://testnet.explorer.perawallet.app/address/${wallet.address}`);
  console.log("\nNext: send Testnet USDC to this address, then: pnpm --filter @agentkeep/api canary");
}

main().catch((e: Error) => {
  console.error("Opt-in failed:", e.message);
  console.error("Ensure the address has Testnet ALGO first (dispenser).");
  process.exit(1);
});
