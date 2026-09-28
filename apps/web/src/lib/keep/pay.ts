import {
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_MAINNET_GENESIS_HASH,
  ExactAvmScheme,
  type ClientAvmSigner,
} from "@x402/avm";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";

export const MAINNET_FULL = `algorand:${ALGORAND_MAINNET_GENESIS_HASH}`;

export function mockPayEnabled(): boolean {
  return process.env.NEXT_PUBLIC_X402_MODE === "mock";
}

export function withIdempotency(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  if (!headers.has("idempotency-key")) {
    headers.set("idempotency-key", crypto.randomUUID());
  }
  return { ...init, headers };
}

/** Pay an x402 402 with the connected wallet, then retry. Mock mode stamps a local test header. */
export async function paidFetch(
  url: string,
  init: RequestInit,
  signer: ClientAvmSigner,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const next = withIdempotency(init);
  if (mockPayEnabled()) {
    const headers = new Headers(next.headers);
    headers.set("x-agentkeep-mock-pay", signer.address);
    return fetchImpl(url, { ...next, headers });
  }
  const client = new x402Client();
  const scheme = new ExactAvmScheme(signer);
  client.register(MAINNET_FULL, scheme);
  client.register(ALGORAND_MAINNET_CAIP2, scheme);
  const pay = wrapFetchWithPayment(fetchImpl, client);
  return pay(url, next);
}
