import { createHash } from "node:crypto";
import {
  ALGORAND_MAINNET_GENESIS_HASH,
  ALGORAND_TESTNET_GENESIS_HASH,
  USDC_MAINNET_ASA_ID,
  USDC_TESTNET_ASA_ID,
  normalizeAlgorandNetwork,
} from "@x402/avm";
import { HTTPFacilitatorClient, type FacilitatorClient } from "@x402/core/server";
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
} from "@x402/core/http";
import type { PaymentPayload, PaymentRequirements, Network } from "@x402/core/types";
import type { AppConfig } from "../config.js";
import { AppError } from "../errors.js";
import type { PaymentAdapter, PaymentProof } from "./adapter.js";

const MAX_TIMEOUT_SECONDS = 300;
const FACILITATOR_TIMEOUT_MS = 10_000;

/** Full-hash CAIP-2 as advertised by GoPlausible `/supported`. */
export function fullCaip2(mode: "testnet" | "mainnet"): Network {
  const hash = mode === "mainnet" ? ALGORAND_MAINNET_GENESIS_HASH : ALGORAND_TESTNET_GENESIS_HASH;
  return `algorand:${hash}` as Network;
}

/** True when two Algorand network ids refer to the same chain (full or truncated CAIP-2). */
export function sameAlgorandNetwork(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    return normalizeAlgorandNetwork(a) === normalizeAlgorandNetwork(b);
  } catch {
    return false;
  }
}

export type LiveAdapterDeps = {
  facilitator?: FacilitatorClient;
  /** Optional override for resource URL base (defaults to PUBLIC_API_BASE). */
  resourceBase?: string;
};

/**
 * CAIP-2 for the x402 wire / GoPlausible facilitator.
 * Prefer full genesis-hash form — truncated `ALGORAND_*_CAIP2` is rejected by GoPlausible verify.
 */
export function wireCaip2(config: AppConfig): Network {
  const fromEnv = config.payment.caip2.trim();
  if (fromEnv.startsWith("algorand:")) {
    // If env accidentally has truncated form, expand via known genesis hashes.
    try {
      const short = normalizeAlgorandNetwork(fromEnv);
      if (fromEnv === short || fromEnv.length <= short.length) {
        return fullCaip2(config.payment.mode);
      }
    } catch {
      /* use as-is */
    }
    return fromEnv as Network;
  }
  return fullCaip2(config.payment.mode);
}

export function wireUsdcAsa(config: AppConfig): string {
  const fromEnv = config.payment.usdcAsaId.trim();
  if (fromEnv) return fromEnv;
  return config.payment.mode === "mainnet" ? USDC_MAINNET_ASA_ID : USDC_TESTNET_ASA_ID;
}

export function buildPaymentRequirements(
  config: AppConfig,
  input: {
    route: string;
    priceMinor: number;
    description: string;
    resourceUrl?: string;
    feePayer?: string;
  },
): PaymentRequirements {
  const network = wireCaip2(config);
  const asset = wireUsdcAsa(config);
  return {
    scheme: "exact",
    network,
    amount: String(input.priceMinor),
    asset,
    payTo: config.payment.payTo,
    maxTimeoutSeconds: MAX_TIMEOUT_SECONDS,
    extra: {
      tag: config.payment.challengeTag,
      asa_id: Number(asset),
      adapter: "live",
      description: input.description,
      resource: input.route,
      ...(input.resourceUrl ? { resource_url: input.resourceUrl } : {}),
      ...(input.feePayer ? { feePayer: input.feePayer } : {}),
    },
  };
}

export function buildPaymentRequired(
  config: AppConfig,
  input: {
    route: string;
    priceMinor: number;
    description: string;
    feePayer?: string;
  },
): {
  x402Version: 2;
  error: string;
  resource: { url: string; description: string; mimeType: string; serviceName: string; tags: string[] };
  accepts: PaymentRequirements[];
} {
  const base = (config.publicApiBase || "http://localhost:8787").replace(/\/$/, "");
  const path = input.route.includes(" ") ? input.route.split(/\s+/)[1]! : input.route;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const accepts = [
    buildPaymentRequirements(config, {
      ...input,
      resourceUrl: url,
      feePayer: input.feePayer,
    }),
  ];
  return {
    x402Version: 2,
    error: "Payment required",
    resource: {
      url,
      description: input.description,
      mimeType: "application/json",
      serviceName: "AgentKeep",
      tags: [config.payment.challengeTag],
    },
    accepts,
  };
}

export function encodePaymentRequired(paymentRequired: ReturnType<typeof buildPaymentRequired>): string {
  return encodePaymentRequiredHeader(paymentRequired);
}

function paymentHeader(headers: Headers): string | null {
  return (
    headers.get("payment-signature") ||
    headers.get("PAYMENT-SIGNATURE") ||
    headers.get("x-payment") ||
    null
  );
}

function isTimeoutError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err);
  return name.includes("Timeout") || /timeout|timed out|AbortError/i.test(msg);
}

export function createLivePaymentAdapter(config: AppConfig, deps: LiveAdapterDeps = {}): PaymentAdapter {
  const facilitator =
    deps.facilitator ??
    new HTTPFacilitatorClient({
      url: config.payment.facilitatorUrl,
      timeoutMs: FACILITATOR_TIMEOUT_MS,
    });

  let feePayer: string | undefined;
  let feePayerLoad: Promise<void> | undefined;

  const ensureFeePayer = async () => {
    if (feePayer) return;
    if (!feePayerLoad) {
      feePayerLoad = (async () => {
        try {
          const supported = await facilitator.getSupported();
          const want = wireCaip2(config);
          const kind = supported.kinds?.find((k) => {
            try {
              return sameAlgorandNetwork(String(k.network), want) && k.scheme === "exact";
            } catch {
              return String(k.network).includes("algorand") && k.scheme === "exact";
            }
          });
          const fp = kind?.extra?.feePayer;
          if (typeof fp === "string" && fp.length > 0) feePayer = fp;
        } catch {
          /* best-effort; client may still work if it fetches /supported itself */
        }
      })();
    }
    await feePayerLoad;
  };

  // Warm cache in background
  void ensureFeePayer();

  return {
    async challenge({ route, priceMinor, description }) {
      await ensureFeePayer();
      const req = buildPaymentRequirements(config, {
        route,
        priceMinor,
        description,
        feePayer,
      });
      return {
        ...req,
        maxAmountRequired: String(priceMinor),
        resource: route,
        description,
      };
    },

    async settle({ route, priceMinor, headers }): Promise<PaymentProof> {
      if (config.payment.pause) {
        throw new AppError("payment_unavailable", "Payments paused");
      }

      const raw = paymentHeader(headers);
      if (!raw) {
        throw new AppError("payment_required", "Payment required");
      }

      let payload: PaymentPayload;
      try {
        payload = decodePaymentSignatureHeader(raw);
      } catch {
        throw new AppError("payment_invalid", "Invalid PAYMENT-SIGNATURE header");
      }

      await ensureFeePayer();
      const requirements =
        "accepted" in payload && payload.accepted
          ? (payload.accepted as PaymentRequirements)
          : buildPaymentRequirements(config, {
              route,
              priceMinor,
              description: route,
              feePayer,
            });

      // Hard checks before facilitator round-trip
      const wantNetwork = wireCaip2(config);
      if (!sameAlgorandNetwork(String(requirements.network), wantNetwork)) {
        throw new AppError("payment_invalid", "Wrong network", {
          expected: wantNetwork,
          got: requirements.network,
        });
      }
      if (String(requirements.payTo) !== config.payment.payTo) {
        throw new AppError("payment_invalid", "Wrong payTo");
      }
      const gotAmount = Number(requirements.amount);
      if (!Number.isFinite(gotAmount) || gotAmount < priceMinor) {
        throw new AppError("payment_insufficient", "Underpaid", {
          required: priceMinor,
          got: gotAmount,
        });
      }
      const wantAsset = wireUsdcAsa(config);
      if (String(requirements.asset) !== wantAsset) {
        throw new AppError("payment_invalid", "Wrong ASA / asset", {
          expected: wantAsset,
          got: requirements.asset,
        });
      }

      let verify;
      try {
        verify = await facilitator.verify(payload, requirements);
      } catch (err) {
        if (isTimeoutError(err)) {
          throw new AppError("payment_unavailable", "Facilitator verify timeout");
        }
        throw new AppError("payment_unavailable", "Facilitator verify failed", {
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      if (!verify.isValid) {
        throw new AppError("payment_invalid", verify.invalidMessage ?? "Payment verification failed", {
          reason: verify.invalidReason,
        });
      }

      let settle;
      try {
        settle = await facilitator.settle(payload, requirements);
      } catch (err) {
        if (isTimeoutError(err)) {
          throw new AppError("payment_unavailable", "Facilitator settle timeout");
        }
        throw new AppError("payment_unavailable", "Facilitator settle failed", {
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      if (!settle.success) {
        throw new AppError("payment_invalid", settle.errorMessage ?? "Payment settlement failed", {
          reason: settle.errorReason,
        });
      }

      const payer = settle.payer ?? verify.payer;
      if (!payer) {
        throw new AppError("payment_invalid", "Settled payment missing payer");
      }

      const nonceSeed = settle.transaction || raw;
      const nonce = createHash("sha256").update(nonceSeed).digest("hex");

      return {
        payer,
        amountMinor: Number(requirements.amount),
        network: config.payment.network,
        nonce,
        proof: settle.transaction || "settled",
        settleResponse: {
          success: true,
          payer,
          transaction: settle.transaction || nonce,
          network: String(settle.network || wantNetwork),
          errorReason: settle.errorReason,
          errorMessage: settle.errorMessage,
        },
      };
    },
  };
}
