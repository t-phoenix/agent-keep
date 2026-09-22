/** USDC minor units helpers — never use floats for money math. */

export const USDC_DECIMALS = 6;

export type Money = {
  amount: number;
  decimals: typeof USDC_DECIMALS;
  asset: "USDC";
  network: string;
  asa_id?: number;
};

/** Parse "$0.001" style prices to minor units. */
export function dollarsToMinor(dollars: string | number): number {
  const n = typeof dollars === "number" ? dollars : Number(dollars.replace(/^\$/, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error(`invalid dollar amount: ${dollars}`);
  return Math.round(n * 10 ** USDC_DECIMALS);
}

export function money(amountMinor: number, network: string, asaId?: number): Money {
  return {
    amount: amountMinor,
    decimals: USDC_DECIMALS,
    asset: "USDC",
    network,
    ...(asaId !== undefined ? { asa_id: asaId } : {}),
  };
}

/** Route list prices (minor units) — docs/21 */
export const ROUTE_PRICES_MINOR = {
  "PUT /v1/memory/:key": dollarsToMinor(0.001),
  "DELETE /v1/memory/:key": dollarsToMinor(0.0005),
  "GET /v1/memory": dollarsToMinor(0.001),
  "POST /v1/artifacts": dollarsToMinor(0.005),
  "POST /v1/notify": dollarsToMinor(0.02),
  "GET /v1/notify/:id": dollarsToMinor(0.0002),
  "GET /v1/inbox": dollarsToMinor(0.002),
  "POST /v1/inbox/:id/ack": dollarsToMinor(0.0005),
  "GET /v1/budget/receipts": dollarsToMinor(0.002),
  "POST /v1/fetch": dollarsToMinor(0.01),
  "GET /v1/trust": dollarsToMinor(0.002),
  "POST /v1/owner/bind/email": dollarsToMinor(0.01),
  "POST /v1/owner/bind/telegram": dollarsToMinor(0.01),
  "PUT /v1/owner/caps": dollarsToMinor(0.001),
  "POST /v1/owner/delete": dollarsToMinor(0.01),
} as const;

export type PaidRouteKey = keyof typeof ROUTE_PRICES_MINOR;
