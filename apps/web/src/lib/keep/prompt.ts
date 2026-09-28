import { USDC_ASA_ID } from "./values";

export const FACILITATOR_URL = "https://facilitator.goplausible.xyz";
export const MAINNET_NETWORK =
  "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
export const SCHEME = "exact";

export function agentPrompt(input: { apiBase: string; siteUrl: string }): string {
  const site = input.siteUrl.replace(/\/$/, "");
  const api = input.apiBase.replace(/\/$/, "");
  return `You are setting up an AI agent to use AgentKeep: paid memory and files for wallet agents on Algorand.

Read and follow ${site}/skill.md before the first call. Also read ${api}/llms.txt for live prices and error codes.

Config
- API_BASE: ${api}
- SCHEME: ${SCHEME}
- NETWORK: ${MAINNET_NETWORK}
- ASSET: USDC
- ASA_ID: ${USDC_ASA_ID}
- FACILITATOR: ${FACILITATOR_URL}
- SESSION_HEADER: X-AgentKeep-Session
- SESSION_TTL: 15 minutes
- DAILY_CAP: 2000000 micro-USDC ($2)

Setup checklist
1. Use an Algorand Mainnet wallet that can sign x402 exact payments (Pera, Lute, Defly, or Kibisis). Do not send Testnet payments to this API.
2. Opt the payer into USDC ASA ${USDC_ASA_ID} and hold enough USDC. A memory write is 1000 micro-USDC ($0.001). The facilitator pays the ALGO fee.
3. There is no API key and no signup.
4. Call the path unpaid first. HTTP 402 plus header PAYMENT-REQUIRED means you pay the accepts[] entry.
5. Retry the same method, URL, and body with PAYMENT-SIGNATURE. Send Idempotency-Key so a retry is not a second charge.
6. Save X-AgentKeep-Session from the success response. For 15 minutes, GET ${api}/v1/memory/{key} and GET ${api}/v1/budget with that header are free. Listing keys (GET ${api}/v1/memory) is paid and mints a new session. When the session expires, pay the list route, then read.
7. Store JSON with PUT ${api}/v1/memory/{key} and body {"value":{},"content_type":"application/json"}. Values are capped at 64 KiB.
8. Binary files use POST ${api}/v1/artifacts. The returned URL is public. Never upload HTML or JavaScript. Never store seeds, passwords, or private keys in memory or artifacts.
9. The hard daily cap is $2 USDC. budget_exceeded means stop, with no side effects.

First task: store a short note under a key you choose, then read it back with the session header.`;
}

export function envConfig(apiBase: string): string {
  const api = apiBase.replace(/\/$/, "");
  return [
    `API_BASE=${api}`,
    `SCHEME=${SCHEME}`,
    `NETWORK=${MAINNET_NETWORK}`,
    `ASSET=USDC`,
    `ASA_ID=${USDC_ASA_ID}`,
    `FACILITATOR=${FACILITATOR_URL}`,
    `SESSION_HEADER=X-AgentKeep-Session`,
    `SESSION_TTL=15m`,
    `DAILY_CAP_MINOR=2000000`,
  ].join("\n");
}
