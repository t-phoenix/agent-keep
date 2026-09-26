import {
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_MAINNET_GENESIS_HASH,
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_TESTNET_GENESIS_HASH,
  USDC_MAINNET_ASA_ID,
  USDC_TESTNET_ASA_ID,
} from "@x402/avm";

export type PaymentMode = "testnet" | "mainnet";
export type PaymentAdapterKind = "mock" | "live";

/** Strip inline `# comments` from .env values (space before #). */
export function stripEnvComment(raw: string): string {
  const idx = raw.search(/\s+#/);
  return (idx >= 0 ? raw.slice(0, idx) : raw).trim();
}

function required(name: string, fallback?: string): string {
  const v = process.env[name];
  const cleaned = v !== undefined ? stripEnvComment(v) : undefined;
  if (cleaned !== undefined && cleaned !== "") return cleaned;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing env ${name}`);
}

function optional(name: string, fallback = ""): string {
  const v = process.env[name];
  if (v === undefined) return fallback;
  const cleaned = stripEnvComment(v);
  return cleaned === "" ? fallback : cleaned;
}

/** Full-hash CAIP-2 strings GoPlausible /supported currently advertises. */
function defaultFullCaip2(isMainnet: boolean): string {
  return isMainnet
    ? `algorand:${ALGORAND_MAINNET_GENESIS_HASH}`
    : `algorand:${ALGORAND_TESTNET_GENESIS_HASH}`;
}

export function loadConfig() {
  const modeRaw = optional("PAYMENT_MODE", "testnet");
  const mode: PaymentMode = modeRaw === "mainnet" ? "mainnet" : "testnet";
  const isMainnet = mode === "mainnet";
  const adapterRaw = optional("PAYMENT_ADAPTER", "mock");
  const adapter: PaymentAdapterKind = adapterRaw === "live" ? "live" : "mock";

  return {
    port: Number(optional("PORT", "8787")),
    nodeEnv: optional("NODE_ENV", "development"),
    payment: {
      facilitator: optional("PAYMENT_FACILITATOR", "goplausible"),
      mode,
      /** Product ledger label (docs/10). Wire CAIP-2 is `caip2`. */
      network: optional(
        "PAYMENT_NETWORK",
        isMainnet ? "ALGORAND_Mainnet_CAIP2" : "ALGORAND_Testnet_CAIP2",
      ),
      /**
       * x402 wire network. Prefer full genesis-hash CAIP-2 (matches GoPlausible /supported).
       * Truncated constants from @x402/avm also normalize via normalizeAlgorandNetwork.
       */
      caip2: optional("PAYMENT_CAIP2", defaultFullCaip2(isMainnet)),
      /** Truncated CAIP-2 from @x402/avm (informational / client hints). */
      caip2Short: isMainnet ? ALGORAND_MAINNET_CAIP2 : ALGORAND_TESTNET_CAIP2,
      usdcAsaId: optional(
        "USDC_ASA_ID",
        isMainnet ? USDC_MAINNET_ASA_ID : USDC_TESTNET_ASA_ID,
      ),
      payTo: optional("PAYTO_ADDRESS", "TESTPAYTOADDRESSPLACEHOLDER000000000000000000"),
      facilitatorUrl: optional("FACILITATOR_URL", "https://facilitator.goplausible.xyz"),
      pause: optional("PAYMENT_PAUSE", "false") === "true",
      adapter,
      challengeTag: optional("X402_CHALLENGE_TAG", "x402-global-challenge"),
    },
    sessionHmacSecret: required("SESSION_HMAC_SECRET", "dev-change-me-to-a-long-random-string"),
    defaultDailyCapMinor: Number(optional("DEFAULT_DAILY_CAP_MINOR", "2000000")),
    publicApiBase: optional("PUBLIC_API_BASE", "http://localhost:8787"),
    /** Marketing site. Bazaar merchant `website` and the API homepage link here. */
    siteUrl: optional("SITE_URL", ""),
    ownerWebBase: optional("OWNER_WEB_BASE", "http://localhost:8787"),
    artifactsBase: optional("ARTIFACTS_BASE", ""),
    databaseUrl: optional("DATABASE_URL", ""),
    r2: {
      accountId: optional("R2_ACCOUNT_ID", ""),
      accessKeyId: optional("R2_ACCESS_KEY_ID", ""),
      secretAccessKey: optional("R2_SECRET_ACCESS_KEY", ""),
      bucket: optional("R2_BUCKET", ""),
    },
    email: {
      apiKey: optional("EMAIL_API_KEY", ""),
      from: optional("EMAIL_FROM", ""),
    },
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
