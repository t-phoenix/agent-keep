import { Hono } from "hono";
import { createHash, randomBytes } from "node:crypto";
import type { AppConfig } from "./config.js";
import { AppError, errorBody } from "./errors.js";
import { ROUTE_PRICES_MINOR, dollarsToMinor } from "./lib/money.js";
import { assertSafeUrlResolved } from "./lib/ssrf.js";
import { newRequestId, verifySessionToken } from "./lib/session.js";
import {
  receiptJson,
  requirePaid,
  type PaymentAdapter,
} from "./payments/adapter.js";
import { createPaymentAdapter } from "./payments/create-adapter.js";
import {
  buildPaymentRequired,
  encodePaymentRequired,
} from "./payments/live-adapter.js";
import { createMemoryStore, type Store } from "./store/memory-store.js";

export type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export type CreateAppOptions = {
  config: AppConfig;
  store?: Store;
  payment?: PaymentAdapter;
};

const MEMORY_MAX = 64 * 1024;

function sessionOrThrow(c: { req: { header: (n: string) => string | undefined } }, config: AppConfig) {
  const token = c.req.header("x-agentkeep-session");
  if (!token) throw new AppError("session_required", "Session or payment proof required");
  const payload = verifySessionToken(token, config.sessionHmacSecret);
  if (!payload) throw new AppError("session_expired", "Session expired or invalid");
  return payload.walletId;
}

export function createApp(opts: CreateAppOptions) {
  const config = opts.config;
  const store = opts.store ?? createMemoryStore(config.defaultDailyCapMinor);
  const payment = opts.payment ?? createPaymentAdapter(config);
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? newRequestId();
    c.set("requestId", requestId);
    c.header("X-Request-Id", requestId);
    await next();
  });

  app.onError((err, c) => {
    const requestId = c.get("requestId") ?? newRequestId();
    if (err instanceof AppError) {
      if (err.code === "payment_required") {
        c.header("Payment-Required", "true");
        const challenge = err.details?.challenge as
          | {
              resource?: string;
              description?: string;
              amount?: string;
              maxAmountRequired?: string;
              extra?: { feePayer?: string };
            }
          | undefined;
        if (challenge) {
          const priceMinor = Number(challenge.amount ?? challenge.maxAmountRequired ?? 0);
          const paymentRequired = buildPaymentRequired(config, {
            route: challenge.resource ?? c.req.path,
            priceMinor: Number.isFinite(priceMinor) ? priceMinor : 0,
            description: challenge.description ?? "Paid AgentKeep route",
            feePayer: challenge.extra?.feePayer,
          });
          try {
            c.header("PAYMENT-REQUIRED", encodePaymentRequired(paymentRequired));
          } catch {
            /* header encode best-effort */
          }
        }
      }
      return c.json(errorBody(err, requestId), err.status as 400);
    }
    console.error("internal_error", requestId, err instanceof Error ? err.message : err);
    return c.json(
      errorBody(new AppError("internal_error", "Internal error"), requestId),
      500,
    );
  });

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/healthz", (c) => c.json({ status: "ok" }));

  // --- Memory ---
  app.put("/v1/memory/:key", async (c) => {
    const key = c.req.param("key");
    if (!key || key.length > 256) throw new AppError("validation_error", "Invalid key");
    const settle = await requirePaid(store, config, payment, {
      route: `PUT /v1/memory/${key}`,
      priceMinor: ROUTE_PRICES_MINOR["PUT /v1/memory/:key"],
      description: "Store a wallet-scoped key/value (≤64KiB); returns metadata and payment receipt.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
      idempotencyKey: c.req.header("idempotency-key"),
    });
    const body = await c.req.json<{ value?: unknown; content_type?: string }>().catch(() => {
      throw new AppError("validation_error", "JSON body required");
    });
    if (body.value === undefined) throw new AppError("validation_error", "value required");
    const serialized = typeof body.value === "string" ? body.value : JSON.stringify(body.value);
    if (Buffer.byteLength(serialized, "utf8") > MEMORY_MAX) {
      throw new AppError("payload_too_large", "Memory value exceeds 64KiB");
    }
    const ttl = Number(c.req.query("ttl_seconds") ?? 7 * 24 * 3600);
    const expiresAt = Date.now() + ttl * 1000;
    await store.putMemory({
      walletId: settle.walletId,
      key,
      value: serialized,
      contentType: body.content_type ?? "application/json",
      expiresAt,
      updatedAt: new Date().toISOString(),
    });
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      key,
      updated_at: new Date().toISOString(),
      expires_at: new Date(expiresAt).toISOString(),
      receipt: receiptJson(config, settle, `PUT /v1/memory/${key}`),
    });
  });

  app.get("/v1/memory/:key", async (c) => {
    const walletId = sessionOrThrow(c, config);
    const key = c.req.param("key");
    const row = await store.getMemory(walletId, key);
    if (!row) throw new AppError("not_found", "Key not found");
    let value: unknown = row.value;
    try {
      value = JSON.parse(row.value);
    } catch {
      /* plain string */
    }
    return c.json({ key, value, content_type: row.contentType, updated_at: row.updatedAt });
  });

  app.delete("/v1/memory/:key", async (c) => {
    const key = c.req.param("key");
    const settle = await requirePaid(store, config, payment, {
      route: `DELETE /v1/memory/${key}`,
      priceMinor: ROUTE_PRICES_MINOR["DELETE /v1/memory/:key"],
      description: "Delete a wallet-scoped memory key.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
      idempotencyKey: c.req.header("idempotency-key"),
    });
    const deleted = await store.deleteMemory(settle.walletId, key);
    if (!deleted) throw new AppError("not_found", "Key not found");
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({ deleted: true, receipt: receiptJson(config, settle, `DELETE /v1/memory/${key}`) });
  });

  app.get("/v1/memory", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "GET /v1/memory",
      priceMinor: ROUTE_PRICES_MINOR["GET /v1/memory"],
      description: "List wallet-scoped memory keys (no values).",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const keys = await store.listMemoryKeys(settle.walletId);
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({ keys, receipt: receiptJson(config, settle, "GET /v1/memory") });
  });

  // --- Fetch ---
  app.post("/v1/fetch", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "POST /v1/fetch",
      priceMinor: ROUTE_PRICES_MINOR["POST /v1/fetch"],
      description:
        "Fetch a public HTTPS URL to text/markdown with SSRF protections; returns truncated body + receipt.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
      idempotencyKey: c.req.header("idempotency-key"),
    });
    const body = await c.req.json<{ url?: string; max_bytes?: number }>().catch(() => {
      throw new AppError("validation_error", "JSON body required");
    });
    if (!body.url) throw new AppError("validation_error", "url required");
    const maxBytes = Math.min(body.max_bytes ?? 100_000, 500_000);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 10_000);
    let text: string;
    let status: number;
    let url: URL;
    try {
      url = await assertSafeUrlResolved(body.url);
      const res = await fetch(url.toString(), {
        signal: ac.signal,
        redirect: "manual",
        headers: { "user-agent": "AgentKeep/0.1 (+https://agentkeep.app)" },
      });
      status = res.status;
      if (res.status >= 300 && res.status < 400) {
        throw new AppError("ssrf_blocked", "Redirects not followed", { status: res.status });
      }
      const buf = Buffer.from(await res.arrayBuffer());
      text = buf.subarray(0, maxBytes).toString("utf8");
    } catch (e) {
      // Post-pay failure → credit (spend offset)
      const { creditWallet } = await import("./payments/adapter.js");
      await creditWallet(store, settle.walletId, settle.chargedMinor + settle.creditAppliedMinor);
      await store.addLedger({
        receiptId: `${settle.receiptId}_cred`,
        walletId: settle.walletId,
        route: "POST /v1/fetch",
        amountMinor: settle.chargedMinor,
        network: config.payment.network,
        status: "credited",
        requestId: c.get("requestId"),
        createdAt: new Date().toISOString(),
      });
      if (e instanceof AppError) throw e;
      if ((e as Error).name === "AbortError") {
        throw new AppError("upstream_timeout", "Upstream timed out");
      }
      throw new AppError("upstream_error", "Upstream fetch failed");
    } finally {
      clearTimeout(timer);
    }
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      url: url.toString(),
      status,
      truncated: text.length >= maxBytes,
      body: text,
      receipt: receiptJson(config, settle, "POST /v1/fetch"),
    });
  });

  // --- Trust ---
  app.get("/v1/trust", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "GET /v1/trust",
      priceMinor: ROUTE_PRICES_MINOR["GET /v1/trust"],
      description: "Probe a URL for reachability and basic x402 Payment-Required signals.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const target = c.req.query("url");
    if (!target) throw new AppError("validation_error", "url query required");
    const url = await assertSafeUrlResolved(target);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    let reachable = false;
    let httpStatus: number | null = null;
    let x402 = false;
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        signal: ac.signal,
        redirect: "manual",
        headers: { "user-agent": "AgentKeep/0.1 trust-probe" },
      });
      reachable = true;
      httpStatus = res.status;
      x402 = res.status === 402 || res.headers.has("payment-required");
    } catch {
      reachable = false;
    } finally {
      clearTimeout(timer);
    }
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      url: url.toString(),
      reachable,
      http_status: httpStatus,
      x402_signal: x402,
      receipt: receiptJson(config, settle, "GET /v1/trust"),
    });
  });

  // --- Budget ---
  app.get("/v1/budget", async (c) => {
    const walletId = sessionOrThrow(c, config);
    const w = await store.getWallet(walletId);
    if (!w) throw new AppError("not_found", "Wallet not found");
    return c.json({
      spent_today_minor: w.spentTodayMinor,
      daily_cap_minor: w.dailyCapMinor,
      remaining_today_minor: w.dailyCapMinor - w.spentTodayMinor,
      credit_minor: w.creditMinor,
      asset: "USDC",
      network: config.payment.network,
    });
  });

  app.get("/v1/budget/receipts", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "GET /v1/budget/receipts",
      priceMinor: ROUTE_PRICES_MINOR["GET /v1/budget/receipts"],
      description: "Export recent settled/credited ledger rows for the paying wallet.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const rows = await store.listLedger(settle.walletId, 50);
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      receipts: rows,
      receipt: receiptJson(config, settle, "GET /v1/budget/receipts"),
    });
  });

  // --- Artifacts (in-memory / public URL stub) ---
  app.post("/v1/artifacts", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "POST /v1/artifacts",
      priceMinor: ROUTE_PRICES_MINOR["POST /v1/artifacts"],
      description: "Upload bytes; returns a public HTTPS URL and content hash.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const ct = c.req.header("content-type") ?? "application/octet-stream";
    if (ct.includes("text/html") || ct.includes("javascript")) {
      throw new AppError("unsupported_media_type", "HTML/JS artifacts not allowed");
    }
    const buf = Buffer.from(await c.req.arrayBuffer());
    if (buf.byteLength > 10 * 1024 * 1024) {
      throw new AppError("payload_too_large", "Artifact exceeds 10MiB");
    }
    // Base price already charged; extra MiB surcharge
    const extraMiB = Math.max(0, Math.ceil(buf.byteLength / (1024 * 1024)) - 1);
    if (extraMiB > 0) {
      await chargeExtra(store, settle.walletId, dollarsToMinor(0.002) * extraMiB);
    }
    const id = randomBytes(10).toString("hex");
    const sha256 = createHash("sha256").update(buf).digest("hex");
    const base = config.artifactsBase || `${config.publicApiBase}/a`;
    const url = `${base}/${id}`;
    await store.putArtifact({
      id,
      walletId: settle.walletId,
      url,
      sha256,
      contentType: ct,
      bytes: buf.byteLength,
      createdAt: new Date().toISOString(),
    });
    // stash bytes in memory map via putArtifact only meta — for MVP serve via /a/:id
    artifactBytes.set(id, buf);
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      id,
      url,
      sha256,
      bytes: buf.byteLength,
      receipt: receiptJson(config, settle, "POST /v1/artifacts"),
    });
  });

  const artifactBytes = new Map<string, Buffer>();
  app.get("/a/:id", async (c) => {
    const id = c.req.param("id");
    const buf = artifactBytes.get(id);
    if (!buf) throw new AppError("not_found", "Artifact not found");
    return new Response(new Uint8Array(buf), {
      headers: { "content-type": "application/octet-stream" },
    });
  });

  // --- Notify ---
  app.post("/v1/notify", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "POST /v1/notify",
      priceMinor: ROUTE_PRICES_MINOR["POST /v1/notify"],
      description: "Create a human approve/deny/answer ticket (owner-bound channels only).",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const w = await store.getWallet(settle.walletId);
    if (!w?.emailBound && !w?.telegramBound) {
      // Dev: auto-bind email so flows work before owner UI
      if (config.nodeEnv === "development" || config.payment.adapter === "mock") {
        await store.upsertWallet({ ...w!, emailBound: true });
      } else {
        throw new AppError("channel_not_bound", "Owner must bind email or Telegram first");
      }
    }
    const body = await c.req.json<{ question?: string; max_wait_seconds?: number }>().catch(() => {
      throw new AppError("validation_error", "JSON body required");
    });
    if (!body.question) throw new AppError("validation_error", "question required");
    const id = `ntf_${randomBytes(8).toString("hex")}`;
    const maxWait = Math.min(body.max_wait_seconds ?? 3600, 86400);
    const ticket = {
      id,
      walletId: settle.walletId,
      status: "pending" as const,
      question: body.question,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + maxWait * 1000).toISOString(),
    };
    await store.putNotify(ticket);
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      id,
      status: "pending",
      poll: `/v1/notify/${id}`,
      receipt: receiptJson(config, settle, "POST /v1/notify"),
    });
  });

  app.get("/v1/notify/:id", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: `GET /v1/notify/${c.req.param("id")}`,
      priceMinor: ROUTE_PRICES_MINOR["GET /v1/notify/:id"],
      description: "Poll notify ticket status until terminal.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const t = await store.getNotify(settle.walletId, c.req.param("id"));
    if (!t) throw new AppError("not_found", "Ticket not found");
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({ ...t, receipt: receiptJson(config, settle, `GET /v1/notify/${t.id}`) });
  });

  // Owner resolve page stub (approve)
  app.post("/owner/notify/:id/resolve", async (c) => {
    const body = await c.req.json<{ wallet_id?: string; status?: string; answer?: string }>();
    if (!body.wallet_id || !body.status) throw new AppError("validation_error", "wallet_id and status required");
    const t = await store.getNotify(body.wallet_id, c.req.param("id"));
    if (!t) throw new AppError("not_found", "Ticket not found");
    const status = body.status as typeof t.status;
    if (!["approved", "denied", "answered", "cancelled"].includes(status)) {
      throw new AppError("validation_error", "Invalid status");
    }
    t.status = status;
    if (body.answer) t.answer = body.answer;
    await store.putNotify(t);
    return c.json(t);
  });

  // --- Inbox ---
  app.get("/v1/inbox", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "GET /v1/inbox",
      priceMinor: ROUTE_PRICES_MINOR["GET /v1/inbox"],
      description: "List inbound messages and inbox address for the paying wallet.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const messages = await store.listInbox(settle.walletId);
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      inbox_address: `${settle.walletId.replace("algo:", "")}@inbox.agentkeep.local`,
      messages,
      receipt: receiptJson(config, settle, "GET /v1/inbox"),
    });
  });

  app.post("/v1/inbox/:id/ack", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: `POST /v1/inbox/${c.req.param("id")}/ack`,
      priceMinor: ROUTE_PRICES_MINOR["POST /v1/inbox/:id/ack"],
      description: "Mark an inbox message as read.",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const ok = await store.ackInbox(settle.walletId, c.req.param("id"));
    if (!ok) throw new AppError("not_found", "Message not found");
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({ acked: true, receipt: receiptJson(config, settle, `POST /v1/inbox/${c.req.param("id")}/ack`) });
  });

  // Dev helper: inject inbox message
  app.post("/v1/dev/inbox", async (c) => {
    if (config.payment.adapter !== "mock") throw new AppError("forbidden", "Dev only");
    const body = await c.req.json<{ wallet_id: string; body: string }>();
    const id = `msg_${randomBytes(6).toString("hex")}`;
    await store.addInbox({
      id,
      walletId: body.wallet_id,
      body: body.body,
      createdAt: new Date().toISOString(),
      acked: false,
    });
    return c.json({ id });
  });

  // --- Owner (minimal) ---
  app.post("/v1/owner/bind/email", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "POST /v1/owner/bind/email",
      priceMinor: ROUTE_PRICES_MINOR["POST /v1/owner/bind/email"],
      description: "Start owner email bind (magic link).",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    await store.withWalletLock(settle.walletId, async (w) => {
      w.emailBound = true;
      await store.upsertWallet(w);
    });
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      status: "bound",
      confirm_url: `${config.ownerWebBase}/owner/confirm-email?token=dev`,
      receipt: receiptJson(config, settle, "POST /v1/owner/bind/email"),
    });
  });

  app.put("/v1/owner/caps", async (c) => {
    const settle = await requirePaid(store, config, payment, {
      route: "PUT /v1/owner/caps",
      priceMinor: ROUTE_PRICES_MINOR["PUT /v1/owner/caps"],
      description: "Update hard daily cap after owner OTP (OTP stub in mock mode).",
      headers: c.req.raw.headers,
      requestId: c.get("requestId"),
    });
    const otp = c.req.header("x-agentkeep-otp");
    if (config.payment.adapter !== "mock" && otp !== "000000") {
      throw new AppError("otp_required", "OTP required");
    }
    const body = await c.req.json<{ daily_cap_minor?: number }>();
    if (body.daily_cap_minor === undefined || body.daily_cap_minor < 0 || body.daily_cap_minor > 50_000_000) {
      throw new AppError("validation_error", "daily_cap_minor out of range");
    }
    await store.withWalletLock(settle.walletId, async (w) => {
      w.dailyCapMinor = body.daily_cap_minor!;
      await store.upsertWallet(w);
    });
    c.header("X-AgentKeep-Session", settle.sessionToken);
    return c.json({
      daily_cap_minor: body.daily_cap_minor,
      receipt: receiptJson(config, settle, "PUT /v1/owner/caps"),
    });
  });

  return { app, store, payment, config };
}

async function chargeExtra(store: Store, walletId: string, minor: number) {
  const { chargeWallet } = await import("./services/budget.js");
  await chargeWallet(store, walletId, minor);
}
