import type { ClientAvmSigner } from "@x402/avm";

export type WalletSignFn = (
  txns: Uint8Array[],
  indexesToSign?: number[],
) => Promise<(Uint8Array | null)[]>;

/**
 * Adapt a browser wallet's signTransactions to the x402 client signer.
 * Indexes the fee-payer will sign stay null so GoPlausible can sponsor the ALGO fee.
 */
export function toWalletSigner(address: string, sign: WalletSignFn): ClientAvmSigner {
  return {
    address,
    async signTransactions(txns, indexesToSign) {
      const signed = await sign(txns, indexesToSign);
      if (signed.length !== txns.length) {
        const indexes = indexesToSign ?? txns.map((_, i) => i);
        const aligned: (Uint8Array | null)[] = txns.map(() => null);
        indexes.forEach((src, i) => {
          aligned[src] = signed[i] ?? null;
        });
        return aligned;
      }
      return txns.map((_, i) => {
        if (indexesToSign && !indexesToSign.includes(i)) return null;
        return signed[i] ?? null;
      });
    },
  };
}
