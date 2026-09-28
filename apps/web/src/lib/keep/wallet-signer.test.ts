import { describe, expect, it } from "vitest";
import { toWalletSigner } from "./wallet-signer";

describe("wallet signer", () => {
  it("returns null for indexes the fee payer will sign", async () => {
    const user = new Uint8Array([1, 2, 3]);
    const signer = toWalletSigner("ADDR", async (txns, indexes) => {
      expect(indexes).toEqual([1]);
      return txns.map((_, i) => (i === 1 ? user : new Uint8Array([9])));
    });
    const out = await signer.signTransactions([new Uint8Array([9]), new Uint8Array([8])], [1]);
    expect(out[0]).toBeNull();
    expect(out[1]).toEqual(user);
  });

  it("realigns a dense list of only the signed transactions", async () => {
    const user = new Uint8Array([7]);
    const signer = toWalletSigner("ADDR", async () => [user]);
    const out = await signer.signTransactions(
      [new Uint8Array([1]), new Uint8Array([2])],
      [1],
    );
    expect(out[0]).toBeNull();
    expect(out[1]).toEqual(user);
  });
});
