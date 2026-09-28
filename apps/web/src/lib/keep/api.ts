import type { ClientAvmSigner } from "@x402/avm";
import { paidFetch } from "./pay";
import type { CachedKey } from "./storage";

export type MemoryWriteResult = {
  key: string;
  updated_at?: string;
  expires_at?: string;
};

export type MemoryReadResult = {
  key: string;
  value: unknown;
  content_type?: string;
  updated_at?: string;
};

export type ListedKey = {
  key: string;
  updatedAt?: string;
  expiresAt?: number;
};

export class KeepRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function sessionFrom(res: Response): string | null {
  return res.headers.get("x-agentkeep-session");
}

async function parseJson<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let message = `Request failed (${res.status})`;
  let code: string | undefined;
  try {
    const body = (await res.json()) as { error?: { message?: string; code?: string } };
    if (body.error?.message) message = body.error.message;
    code = body.error?.code;
  } catch {
    /* keep status message */
  }
  throw new KeepRequestError(message, res.status, code);
}

export async function putMemory(
  apiBase: string,
  signer: ClientAvmSigner,
  key: string,
  value: unknown,
): Promise<{ result: MemoryWriteResult; session: string | null }> {
  const res = await paidFetch(`${apiBase}/v1/memory/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value, content_type: "application/json" }),
  }, signer);
  const result = await parseJson<MemoryWriteResult>(res);
  return { result, session: sessionFrom(res) };
}

export async function postArtifact(
  apiBase: string,
  signer: ClientAvmSigner,
  file: Blob,
  mediaType: string,
): Promise<{ url: string; bytes: number; session: string | null }> {
  const res = await paidFetch(`${apiBase}/v1/artifacts`, {
    method: "POST",
    headers: { "content-type": mediaType || "application/octet-stream" },
    body: file,
  }, signer);
  const body = await parseJson<{ url: string; bytes: number }>(res);
  return { url: body.url, bytes: body.bytes, session: sessionFrom(res) };
}

export async function listMemory(
  apiBase: string,
  signer: ClientAvmSigner,
): Promise<{ keys: ListedKey[]; session: string | null }> {
  const res = await paidFetch(`${apiBase}/v1/memory`, { method: "GET" }, signer);
  const body = await parseJson<{ keys?: ListedKey[] }>(res);
  return { keys: body.keys ?? [], session: sessionFrom(res) };
}

export async function getMemory(
  apiBase: string,
  key: string,
  session: string,
): Promise<MemoryReadResult> {
  const res = await fetch(`${apiBase}/v1/memory/${encodeURIComponent(key)}`, {
    headers: { "x-agentkeep-session": session },
  });
  return parseJson<MemoryReadResult>(res);
}

export function mergeKinds(rows: ListedKey[], cached: CachedKey[]): CachedKey[] {
  const kinds = new Map(cached.map((row) => [row.key, row.kind]));
  return rows.map((row) => ({
    key: row.key,
    updatedAt: row.updatedAt,
    expiresAt: typeof row.expiresAt === "number" ? row.expiresAt : undefined,
    kind: kinds.get(row.key),
  }));
}
