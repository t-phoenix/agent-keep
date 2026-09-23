import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { FacilitatorClient, SettleResponse, VerifyResponse } from "@x402/core/server";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { stripEnvComment, loadConfig } from "../../src/config.js";
import { AppError } from "../../src/errors.js";
import {
  buildPaymentRequired,
  createLivePaymentAdapter,
  wireCaip2,
  wireUsdcAsa,
} from "../../src/payments/live-adapter.js";

function testEnv() {
  process.env.SESSION_HMAC_SECRET = "test-secret-please-change";
  process.env.PAYMENT_ADAPTER = "live";
  process.env.PAYMENT_MODE = "testnet";
  process.env.PAYTO_ADDRESS = "TESTPAYTO111111111111111111111111111111111111";
  process.env.FACILITATOR_URL = "https://facilitator.goplausible.xyz";
  process.env.PUBLIC_API_BASE = "https://example.test";
  process.env.PAYMENT_CAIP2 = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
  process.env.USDC_ASA_ID = "10458941";
  return loadConfig();
}

function makePayload(requirements: PaymentRequirements): PaymentPayload {
  return {
    x402Version: 2,
    accepted: requirements,
    payload: {
      paymentGroup: ["fake-txn"],
      paymentIndex: 0,
    },
  } as PaymentPayload;
}

function mockFacilitator(opts: {
  verify?: VerifyResponse;
  settle?: SettleResponse;
  verifyError?: Error;
  settleError?: Error;
}): FacilitatorClient {
  return {
    verify: vi.fn(async () => {
      if (opts.verifyError) throw opts.verifyError;
      return opts.verify ?? { isValid: true, payer: "PAYER_ALGO_ADDR" };
    }),
    settle: vi.fn(async () => {
      if (opts.settleError) throw opts.settleError;
      return (
        opts.settle ?? {
          success: true,
          payer: "PAYER_ALGO_ADDR",
          transaction: "TXN_HASH_1",
          network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
        }
      );
    }),
    getSupported: vi.fn(async () => ({ kinds: [] })),
  };
}

describe("stripEnvComment", () => {
  it("strips inline hash comments", () => {
    expect(stripEnvComment("mock #live #mock")).toBe("mock");
    expect(stripEnvComment("testnet #mainnet")).toBe("testnet");
    expect(stripEnvComment("https://example.com/path")).toBe("https://example.com/path");
  });
});

describe("live payment adapter", () => {
  it("challenge includes challenge tag + wire amount", () => {
    const config = testEnv();
    const adapter = createLivePaymentAdapter(config, { facilitator: mockFacilitator({}) });
    const challenge = adapter.challenge({
      route: "PUT /v1/memory/foo",
      priceMinor: 1000,
      description: "Store memory",
    });
    expect(challenge.scheme).toBe("exact");
    expect(challenge.amount).toBe("1000");
    expect((challenge.extra as { tag: string }).tag).toBe("x402-global-challenge");
    expect(challenge.payTo).toBe(config.payment.payTo);
    expect(wireUsdcAsa(config)).toBe("10458941");
    expect(wireCaip2(config)).toContain("algorand:");
  });

  it("buildPaymentRequired encodes PAYMENT-REQUIRED envelope", () => {
    const config = testEnv();
    const pr = buildPaymentRequired(config, {
      route: "POST /v1/fetch",
      priceMinor: 10000,
      description: "Fetch URL",
    });
    expect(pr.x402Version).toBe(2);
    expect(pr.accepts[0]!.amount).toBe("10000");
    expect(pr.resource.tags).toContain("x402-global-challenge");
    expect(pr.resource.url).toBe("https://example.test/v1/fetch");
  });

  it("settles with PAYMENT-SIGNATURE via facilitator verify+settle", async () => {
    const config = testEnv();
    const facilitator = mockFacilitator({});
    const adapter = createLivePaymentAdapter(config, { facilitator });
    const requirements = adapter.challenge({
      route: "PUT /v1/memory/k",
      priceMinor: 1000,
      description: "mem",
    }) as unknown as PaymentRequirements;
    const payload = makePayload({
      scheme: "exact",
      network: wireCaip2(config),
      amount: "1000",
      asset: "10458941",
      payTo: config.payment.payTo,
      maxTimeoutSeconds: 300,
      extra: { tag: "x402-global-challenge" },
    });
    const header = encodePaymentSignatureHeader(payload);
    const proof = await adapter.settle({
      route: "PUT /v1/memory/k",
      priceMinor: 1000,
      headers: new Headers({ "payment-signature": header }),
    });
    expect(proof.payer).toBe("PAYER_ALGO_ADDR");
    expect(proof.amountMinor).toBe(1000);
    expect(proof.nonce).toBe(createHash("sha256").update("TXN_HASH_1").digest("hex"));
    expect(facilitator.verify).toHaveBeenCalledOnce();
    expect(facilitator.settle).toHaveBeenCalledOnce();
    void requirements;
  });

  it("rejects wrong ASA before facilitator", async () => {
    const config = testEnv();
    const facilitator = mockFacilitator({});
    const adapter = createLivePaymentAdapter(config, { facilitator });
    const payload = makePayload({
      scheme: "exact",
      network: wireCaip2(config),
      amount: "1000",
      asset: "999",
      payTo: config.payment.payTo,
      maxTimeoutSeconds: 300,
    });
    const header = encodePaymentSignatureHeader(payload);
    await expect(
      adapter.settle({
        route: "PUT /v1/memory/k",
        priceMinor: 1000,
        headers: new Headers({ "payment-signature": header }),
      }),
    ).rejects.toMatchObject({ code: "payment_invalid" } satisfies Partial<AppError>);
    expect(facilitator.verify).not.toHaveBeenCalled();
  });

  it("maps facilitator timeout to payment_unavailable", async () => {
    const config = testEnv();
    const err = new Error("timed out");
    err.name = "FacilitatorTimeoutError";
    const facilitator = mockFacilitator({ verifyError: err });
    const adapter = createLivePaymentAdapter(config, { facilitator });
    const payload = makePayload({
      scheme: "exact",
      network: wireCaip2(config),
      amount: "1000",
      asset: "10458941",
      payTo: config.payment.payTo,
      maxTimeoutSeconds: 300,
    });
    const header = encodePaymentSignatureHeader(payload);
    await expect(
      adapter.settle({
        route: "PUT /v1/memory/k",
        priceMinor: 1000,
        headers: new Headers({ "payment-signature": header }),
      }),
    ).rejects.toMatchObject({ code: "payment_unavailable" });
  });
});
