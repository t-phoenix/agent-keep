export type CachedKey = {
  key: string;
  updatedAt?: string;
  expiresAt?: number;
  kind?: string;
};

const LIST_PREFIX = "ak-keep-keys:";
const SESSION_PREFIX = "ak-keep-session:";
const CHECKS_KEY = "ak-keep-checks";

export type ManualChecks = {
  apiCopied: boolean;
  sessionRule: boolean;
  noSecrets: boolean;
  publicArtifacts: boolean;
  pastedPrompt: boolean;
};

const EMPTY_CHECKS: ManualChecks = {
  apiCopied: false,
  sessionRule: false,
  noSecrets: false,
  publicArtifacts: false,
  pastedPrompt: false,
};

export function sessionStorageKey(address: string): string {
  return `${SESSION_PREFIX}${address}`;
}

export function readSessionToken(address: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(sessionStorageKey(address));
}

export function writeSessionToken(address: string, token: string): void {
  sessionStorage.setItem(sessionStorageKey(address), token);
}

export function readCachedKeys(address: string): CachedKey[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LIST_PREFIX}${address}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedKey[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedKeys(address: string, keys: CachedKey[]): void {
  localStorage.setItem(`${LIST_PREFIX}${address}`, JSON.stringify(keys));
}

export function upsertCachedKey(address: string, row: CachedKey): CachedKey[] {
  const current = readCachedKeys(address).filter((item) => item.key !== row.key);
  const next = [row, ...current];
  writeCachedKeys(address, next);
  return next;
}

export function readManualChecks(): ManualChecks {
  if (typeof localStorage === "undefined") return { ...EMPTY_CHECKS };
  try {
    const raw = localStorage.getItem(CHECKS_KEY);
    if (!raw) return { ...EMPTY_CHECKS };
    return { ...EMPTY_CHECKS, ...(JSON.parse(raw) as Partial<ManualChecks>) };
  } catch {
    return { ...EMPTY_CHECKS };
  }
}

export function writeManualChecks(checks: ManualChecks): void {
  localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
}
