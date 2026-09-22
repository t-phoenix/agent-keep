export type PaymentMode = "testnet" | "mainnet";
export type PaymentAdapterKind = "mock" | "live";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing env ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export function loadConfig() {
  const mode = (optional("PAYMENT_MODE", "testnet") as PaymentMode) || "testnet";
  const isMainnet = mode === "mainnet";
  return {
    port: Number(optional("PORT", "8787")),
    nodeEnv: optional("NODE_ENV", "development"),
    payment: {
      facilitator: optional("PAYMENT_FACILITATOR", "goplausible"),
      mode,
      network: optional(
        "PAYMENT_NETWORK",
        isMainnet ? "ALGORAND_Mainnet_CAIP2" : "ALGORAND_Testnet_CAIP2",
      ),
      /** Wire CAIP-2 for @x402/avm — Testnet genesis hash form from Foundation guide */
      caip2: optional(
        "PAYMENT_CAIP2",
        isMainnet
          ? "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
          : "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      ),
      usdcAsaId: optional("USDC_ASA_ID", isMainnet ? "31566704" : "10458941"),
      payTo: optional("PAYTO_ADDRESS", "TESTPAYTOADDRESSPLACEHOLDER000000000000000000"),
      facilitatorUrl: optional("FACILITATOR_URL", "https://facilitator.goplausible.xyz"),
      pause: optional("PAYMENT_PAUSE", "false") === "true",
      adapter: (optional("PAYMENT_ADAPTER", "mock") as PaymentAdapterKind) || "mock",
      challengeTag: optional("X402_CHALLENGE_TAG", "x402-global-challenge"),
    },
    sessionHmacSecret: required("SESSION_HMAC_SECRET", "dev-change-me-to-a-long-random-string"),
    defaultDailyCapMinor: Number(optional("DEFAULT_DAILY_CAP_MINOR", "2000000")),
    publicApiBase: optional("PUBLIC_API_BASE", "http://localhost:8787"),
    ownerWebBase: optional("OWNER_WEB_BASE", "http://localhost:8787"),
    artifactsBase: optional("ARTIFACTS_BASE", ""),
    databaseUrl: optional("DATABASE_URL", ""),
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
