/**
 * Demo commands for the recording. Pays on Algorand Mainnet with AVM_MNEMONIC.
 *
 *   demo/save <task> <note.txt> [image.png]
 *   demo/list
 *   demo/read <task>
 *
 * DEMO_MODE=test (default) stores a fresh key each run so rehearsals do not overwrite the take.
 * DEMO_MODE=record stores task:<task> and overwrites that same key, which is the video.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import {
  toClientAvmSigner,
  ExactAvmScheme,
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_MAINNET_GENESIS_HASH,
} from "@x402/avm";
import {
  ed25519SigningKeyFromWrappedSecret,
  type WrappedEd25519Seed,
} from "@algorandfoundation/algokit-utils/crypto";
import { seedFromMnemonic } from "@algorandfoundation/algokit-utils/algo25";

const repoRoot = existsSync(resolve(process.cwd(), "demo/save"))
  ? process.cwd()
  : resolve(process.cwd(), "../..");
const demoDir = resolve(repoRoot, "demo");
const outDir = resolve(demoDir, "out");
const sessionPath = resolve(demoDir, ".session");

type Note = {
  title: string;
  text: string;
  image_url?: string;
  saved_at: string;
};

function loadDotEnv() {
  for (const path of [resolve(repoRoot, ".env"), resolve(process.cwd(), ".env")]) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      const hash = v.search(/\s+#/);
      if (hash >= 0) v = v.slice(0, hash).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[k] === undefined) process.env[k] = v;
    }
    return;
  }
}

function slug(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!s) throw new Error("Task name is empty");
  return s.slice(0, 40);
}

function mode(): "test" | "record" {
  return process.env.DEMO_MODE === "record" ? "record" : "test";
}

function keyFor(task: string): string {
  const name = slug(task);
  if (mode() === "record") return `task:${name}`;
  const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
  return `rehearsal:${name}:${stamp}`;
}

function contentType(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  throw new Error("Image must be png, jpg, webp, or gif");
}

async function payer() {
  loadDotEnv();
  const mnemonic = process.env.AVM_MNEMONIC?.trim();
  if (!mnemonic) throw new Error("AVM_MNEMONIC is missing from .env");
  const seed = seedFromMnemonic(mnemonic);
  const seedCopy = new Uint8Array(seed);
  const wrapped: WrappedEd25519Seed = {
    unwrapEd25519Seed: async () => seed,
    wrapEd25519Seed: async () => {},
  };
  const secret = await ed25519SigningKeyFromWrappedSecret(wrapped);
  const secretKey = Buffer.concat([Buffer.from(seedCopy), Buffer.from(secret.ed25519Pubkey)]).toString("base64");
  const signer = toClientAvmSigner(secretKey);
  const client = new x402Client();
  const scheme = new ExactAvmScheme(signer);
  client.register(`algorand:${ALGORAND_MAINNET_GENESIS_HASH}`, scheme);
  client.register(ALGORAND_MAINNET_CAIP2, scheme);
  const base = (process.env.CANARY_BASE_URL || "https://api.agentkeep.online").replace(/\/$/, "");
  return { pay: wrapFetchWithPayment(fetch, client), base, address: signer.address, client };
}

function rememberSession(token: string | null) {
  if (!token) return;
  mkdirSync(demoDir, { recursive: true });
  const exp = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()).exp as number;
  writeFileSync(sessionPath, JSON.stringify({ token, exp }));
}

function savedSession(): string | null {
  if (!existsSync(sessionPath)) return null;
  const row = JSON.parse(readFileSync(sessionPath, "utf8")) as { token: string; exp: number };
  if (row.exp < Date.now() + 5_000) return null;
  return row.token;
}

function showExchange(
  client: x402Client,
  label: string,
  res: Response,
  json: Record<string, unknown>,
) {
  console.log(`\n${label}`);
  console.log(`  HTTP ${res.status}  ${res.url || ""}`);
  let paid = false;
  try {
    const settled = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
      res.headers.get(name),
    ) as { success?: boolean; transaction?: string; payer?: string };
    if (settled?.transaction) {
      paid = true;
      console.log(`  paid: yes`);
      console.log(`  transaction: ${settled.transaction}`);
      console.log(`  explorer: https://explorer.perawallet.app/tx/${settled.transaction}`);
    }
  } catch {
    paid = false;
  }
  if (!paid) console.log("  paid: no, this read used the open 15-minute pass");
  const receipt = json.receipt as { receipt_id?: string; money?: { amount?: number } } | undefined;
  if (receipt?.receipt_id) {
    const minor = receipt.money?.amount ?? 0;
    console.log(`  receipt: ${receipt.receipt_id}`);
    console.log(`  usdc: $${(minor / 1_000_000).toFixed(4)}`);
  }
}

async function paidJson(
  client: x402Client,
  pay: (url: string, init?: RequestInit) => Promise<Response>,
  label: string,
  url: string,
  init: RequestInit,
): Promise<{ json: { url?: string; keys?: Array<{ key: string }> }; session: string | null }> {
  const res = await pay(url, init);
  const text = await res.text();
  let json: unknown = text;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  const session = res.headers.get("x-agentkeep-session");
  rememberSession(session);
  if (!res.ok) {
    const code = (json as { error?: { code?: string } })?.error?.code || res.status;
    throw new Error(`${init.method || "GET"} ${url} failed (${code})`);
  }
  const body = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  showExchange(client, label, res, body);
  return { json: body as { url?: string; keys?: Array<{ key: string }> }, session };
}

async function listKeys(client: x402Client, pay: (url: string, init?: RequestInit) => Promise<Response>, base: string) {
  const { json } = await paidJson(client, pay, "List saves", `${base}/v1/memory`, { method: "GET" });
  return (json.keys || []) as Array<{ key: string }>;
}

async function readKey(
  client: x402Client,
  pay: (url: string, init?: RequestInit) => Promise<Response>,
  base: string,
  key: string,
): Promise<unknown | null> {
  let token = savedSession();
  if (!token) {
    await listKeys(client, pay, base);
    token = savedSession();
  }
  if (!token) throw new Error("Could not mint a session");
  const url = `${base}/v1/memory/${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { "x-agentkeep-session": token } });
  const body = await res.json().catch(() => ({})) as { value?: unknown; error?: { code?: string } };
  showExchange(client, `Read ${key}`, res, body as Record<string, unknown>);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(body.error?.code || `read failed ${res.status}`);
  return body.value ?? null;
}

function asNote(key: string, value: unknown): Note {
  if (value && typeof value === "object" && typeof (value as Note).text === "string") {
    const note = value as Note;
    return {
      title: note.title || key,
      text: note.text,
      image_url: note.image_url,
      saved_at: note.saved_at || "",
    };
  }
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const maybeUrl = value && typeof value === "object" ? (value as { url?: unknown }).url : undefined;
  return {
    title: key,
    text,
    image_url: typeof maybeUrl === "string" ? maybeUrl : undefined,
    saved_at: "",
  };
}

function render(key: string, note: Note) {
  mkdirSync(outDir, { recursive: true });
  const image = note.image_url
    ? `<img src="${note.image_url}" alt="" style="max-width:100%;border-radius:12px" />`
    : "";
  const html = `<!doctype html><meta charset="utf-8"><title>${note.title}</title>
<body style="font:18px/1.45 system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;background:#0B1F1A;color:#e7f2ec">
<p style="letter-spacing:.08em;text-transform:uppercase;font-size:.75rem">AgentKeep · ${key}</p>
<h1>${note.title}</h1>
${image}
<pre style="white-space:pre-wrap;font:inherit">${note.text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</pre>
<p style="opacity:.7">Saved ${note.saved_at}. The image link stays. The read pass lasts 15 minutes.</p>
</body>`;
  const file = resolve(outDir, "latest.html");
  writeFileSync(file, html);
  return file;
}

function findKey(keys: Array<{ key: string }>, task: string): string | undefined {
  const raw = task.trim();
  const exact = keys.find((k) => k.key === raw)?.key;
  if (exact) return exact;
  const name = slug(task);
  if (mode() === "record") return keys.find((k) => k.key === `task:${name}`)?.key;
  return keys
    .map((k) => k.key)
    .filter((k) => k.startsWith(`rehearsal:${name}:`))
    .sort()
    .at(-1);
}

async function main() {
  const [cmd, task, textFile, imageFile] = process.argv.slice(2);
  const { pay, base, address, client } = await payer();
  console.log(`Mode ${mode()} · wallet ${address.slice(0, 6)}…${address.slice(-4)} · ${base}`);

  if (cmd === "save") {
    if (!task || !textFile) {
      console.error("Usage: demo/save <task-name> <note.txt> [image.png]");
      process.exit(1);
    }
    const text = readFileSync(resolve(repoRoot, textFile), "utf8").trim();
    const key = keyFor(task);
    let image_url: string | undefined;
    if (imageFile) {
      const buf = readFileSync(resolve(repoRoot, imageFile));
      const up = await paidJson(client, pay, "Store image", `${base}/v1/artifacts`, {
        method: "POST",
        headers: { "content-type": contentType(imageFile) },
        body: new Uint8Array(buf),
      });
      image_url = up.json.url as string;
      console.log(`Image ${image_url}`);
    }
    const note: Note = { title: task, text, image_url, saved_at: new Date().toISOString() };
    await paidJson(client, pay, "Save note", `${base}/v1/memory/${encodeURIComponent(key)}?ttl_seconds=2592000`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: note }),
    });
    const page = render(key, note);
    console.log(`Saved ${key} for 30 days`);
    console.log(`Open ${page}`);
    return;
  }

  if (cmd === "list") {
    const keys = await listKeys(client, pay, base);
    if (keys.length === 0) console.log("No saves for this wallet.");
    for (const row of keys) console.log(row.key);
    return;
  }

  if (cmd === "read") {
    if (!task) {
      console.error("Usage: demo/read <task-name>");
      process.exit(1);
    }
    const keys = await listKeys(client, pay, base);
    const key = findKey(keys, task);
    if (!key) {
      console.error(`No save named ${task} for this wallet in ${mode()} mode.`);
      process.exit(1);
    }
    const value = await readKey(client, pay, base, key);
    if (value === null || value === undefined) {
      console.error(`Key ${key} is empty.`);
      process.exit(1);
    }
    const note = asNote(key, value);
    console.log(`\n${note.title}\n`);
    console.log(note.text);
    if (note.image_url) console.log(`\nImage ${note.image_url}`);
    console.log(`\nOpen ${render(key, note)}`);
    return;
  }

  console.error("Usage: demo/save | demo/list | demo/read");
  process.exit(1);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
