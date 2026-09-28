"use client";

import { NetworkId, WalletManager } from "@txnlab/use-wallet";
import { defly } from "@txnlab/use-wallet-defly";
import { kibisis } from "@txnlab/use-wallet-kibisis";
import { lute } from "@txnlab/use-wallet-lute";
import { pera } from "@txnlab/use-wallet-pera";

let manager: WalletManager | null = null;

/** One manager for the page so Pera's WalletConnect session is not created twice. */
export function getKeepWalletManager(): WalletManager {
  if (!manager) {
    manager = new WalletManager({
      defaultNetwork: NetworkId.MAINNET,
      wallets: [
        pera({ chainId: 416001, shouldShowSignTxnToast: false }),
        lute({ siteName: "AgentKeep" }),
        defly({ chainId: 416001, shouldShowSignTxnToast: false }),
        kibisis(),
      ],
    });
  }
  return manager;
}
