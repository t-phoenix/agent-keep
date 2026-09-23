import { createHash, randomBytes } from "node:crypto";
import type { AppConfig } from "../config.js";
import { AppError } from "../errors.js";
import { money } from "../lib/money.js";
import { mintSessionToken, toWalletId } from "../lib/session.js";
import { chargeWallet, creditWallet } from "../services/budget.js";
import type { Store } from "../store/memory-store.js";

export type PaymentProof = {
  /** Paying Algorand address */
  payer: string;
  amountMinor: number;
  network: string;
  nonce: string;
  /** Opaque proof blob from client (mock: any non-empty) */
  proof: string;
};

export type SettleOk = {
  walletId: string;
  receiptId: string;
  sessionToken: string;
  chargedMinor: number;
  creditAppliedMinor: number;
};

export interface PaymentAdapter {
  /** Build 402 challenge payload for a route. */
  challenge(input: {
    route: string;
    priceMinor: number;
    description: string;
  }): Record<string, unknown>;

  /**
   * Verify + settle. Mock accepts header X-AgentKeep-Mock-Pay: <address>.
   * Live adapter will call GoPlausible / @x402.
   */
  settle(input: {
    route: string;
    priceMinor: number;
    headers: Headers;
  }): Promise<PaymentProof>;
}

export function createMockPaymentAdapter(config: AppConfig): PaymentAdapter {
  return {
    challenge({ route, priceMinor, description }) {
      return {
        scheme: "exact",
        network: config.payment.network,
        amount: String(priceMinor),
        maxAmountRequired: String(priceMinor),
        asset: String(config.payment.usdcAsaId || "USDC"),
        payTo: config.payment.payTo,
        maxTimeoutSeconds: 300,
        resource: route,
        description,
        extra: {
          tag: config.payment.challengeTag,
          asa_id: Number(config.payment.usdcAsaId),
          adapter: "mock",
        },
      };
    },
    async settle({ priceMinor, headers }) {
      if (config.payment.pause) {
        throw new AppError("payment_unavailable", "Payments paused");
      }
      const payer = headers.get("x-agentkeep-mock-pay");
      if (!payer) {
        throw new AppError("payment_required", "Payment required");
      }
      const nonce = headers.get("x-agentkeep-mock-nonce") ?? randomBytes(8).toString("hex");
      const amountHdr = headers.get("x-agentkeep-mock-amount");
      const amountMinor = amountHdr ? Number(amountHdr) : priceMinor;
      if (amountMinor < priceMinor) {
        throw new AppError("payment_insufficient", "Underpaid", {
          required: priceMinor,
          got: amountMinor,
        });
      }
      return {
        payer,
        amountMinor,
        network: config.payment.network,
        nonce,
        proof: "mock",
      };
    },
  };
}

export async function requirePaid(
  store: Store,
  config: AppConfig,
  adapter: PaymentAdapter,
  input: {
    route: string;
    priceMinor: number;
    description: string;
    headers: Headers;
    requestId: string;
    idempotencyKey?: string | null;
  },
): Promise<SettleOk> {
  if (config.payment.pause) {
    throw new AppError("payment_unavailable", "Payments paused");
  }

  // Unpaid → 402 with challenge
  const hasMock = input.headers.get("x-agentkeep-mock-pay");
  const hasLive = input.headers.get("payment-signature") || input.headers.get("x-payment");
  if (!hasMock && !hasLive) {
    const challenge = adapter.challenge({
      route: input.route,
      priceMinor: input.priceMinor,
      description: input.description,
    });
    throw new AppError("payment_required", "Payment required", { challenge });
  }

  let proof: PaymentProof;
  try {
    proof = await adapter.settle({
      route: input.route,
      priceMinor: input.priceMinor,
      headers: input.headers,
    });
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("payment_invalid", "Payment verification failed");
  }

  if (await store.seenNonce(proof.nonce)) {
    throw new AppError("payment_replay", "Payment nonce already used");
  }
  await store.markNonce(proof.nonce);

  const walletId = toWalletId(proof.payer);

  if (input.idempotencyKey) {
    const existing = await store.findLedgerByIdempotency(walletId, input.idempotencyKey);
    if (existing && existing.status === "settled") {
      return {
        walletId,
        receiptId: existing.receiptId,
        sessionToken: mintSessionToken(walletId, config.sessionHmacSecret),
        chargedMinor: existing.amountMinor,
        creditAppliedMinor: 0,
      };
    }
  }

  const charge = await chargeWallet(store, walletId, input.priceMinor);
  const receiptId = `rcpt_${createHash("sha256").update(`${walletId}:${proof.nonce}`).digest("hex").slice(0, 16)}`;

  await store.addLedger({
    receiptId,
    walletId,
    route: input.route,
    amountMinor: charge.chargedMinor,
    network: config.payment.network,
    status: "settled",
    requestId: input.requestId,
    createdAt: new Date().toISOString(),
    idempotencyKey: input.idempotencyKey ?? undefined,
  });

  return {
    walletId,
    receiptId,
    sessionToken: mintSessionToken(walletId, config.sessionHmacSecret),
    chargedMinor: charge.chargedMinor,
    creditAppliedMinor: charge.creditAppliedMinor,
  };
}

export function receiptJson(
  config: AppConfig,
  settle: SettleOk,
  route: string,
): Record<string, unknown> {
  return {
    receipt_id: settle.receiptId,
    route,
    money: money(settle.chargedMinor, config.payment.network, Number(config.payment.usdcAsaId)),
    status: "settled",
    credit_applied_minor: settle.creditAppliedMinor,
  };
}

export { creditWallet };
