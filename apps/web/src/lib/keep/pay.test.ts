import { afterEach, describe, expect, it } from "vitest";
import { paidFetch } from "./pay";

describe("paid fetch mock mode", () => {
  const previous = process.env.NEXT_PUBLIC_X402_MODE;

  afterEach(() => {
    process.env.NEXT_PUBLIC_X402_MODE = previous;
  });

  it("stamps the mock pay header and an idempotency key", async () => {
    process.env.NEXT_PUBLIC_X402_MODE = "mock";
    let seen: Headers | undefined;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      seen = new Headers(init?.headers);
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const res = await paidFetch(
      "http://localhost/v1/memory/k",
      { method: "PUT", body: "{}" },
      {
        address: "WALLET_A",
        signTransactions: async () => [],
      },
      fetchImpl,
    );
    expect(res.status).toBe(200);
    expect(seen?.get("x-agentkeep-mock-pay")).toBe("WALLET_A");
    expect(seen?.get("idempotency-key")).toBeTruthy();
  });
});
