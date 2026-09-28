"use client";

import { WalletProvider } from "@txnlab/use-wallet-react";
import { KeepStudio } from "./KeepStudio";
import { getKeepWalletManager } from "./wallets";

export default function KeepApp() {
  return (
    <WalletProvider manager={getKeepWalletManager()}>
      <KeepStudio />
    </WalletProvider>
  );
}
