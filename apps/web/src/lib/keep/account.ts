import { USDC_ASA_ID } from "./values";

const ALGOD = "https://mainnet-api.algonode.cloud/v2/accounts/";

export type AccountStatus = {
  exists: boolean;
  optedIn: boolean;
  usdcMinor: number;
};

export async function fetchAccountStatus(address: string): Promise<AccountStatus> {
  const res = await fetch(`${ALGOD}${encodeURIComponent(address)}`, {
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return { exists: false, optedIn: false, usdcMinor: 0 };
  if (!res.ok) throw new Error(`Account lookup failed (${res.status})`);
  const body = (await res.json()) as {
    assets?: { "asset-id": number; amount: number }[];
  };
  const asset = body.assets?.find((row) => row["asset-id"] === USDC_ASA_ID);
  return {
    exists: true,
    optedIn: Boolean(asset),
    usdcMinor: asset?.amount ?? 0,
  };
}

export function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
