# 21 — Pre-build decisions (locked from audit)

**Status:** Locked 2026-09-07 · Amended 2026-09-21 for Algorand Global x402 Challenge  
**Supersedes** open/ambiguous bits in `20` for product semantics.  
**Rule:** If it conflicts with older docs, **this file wins** until revised — **except** challenge eligibility / rail / facilitator / network, where [`27-algorand-x402-challenge.md`](27-algorand-x402-challenge.md) wins. Calendar/execution: [`28-hackathon-impl-test-prod-roadmap.md`](28-hackathon-impl-test-prod-roadmap.md).

---

## A0. Hackathon rail override (active)

| Decision | Lock (challenge track) |
|----------|------------------------|
| Entry type | **Composite** — many paid routes, **one** Mainnet `payTo` |
| Rail | x402 |
| Facilitator | **GoPlausible only** (leaderboard attribution) |
| Network Testnet | `ALGORAND_Testnet_CAIP2` · USDC ASA **10458941** |
| Network Mainnet | `ALGORAND_Mainnet_CAIP2` · USDC ASA **31566704** |
| Tenant identity | `algo:<address>` (canonical lowercase Algorand address) |
| Discovery | Bazaar extension + tag **`x402-global-challenge`** on every paid route |
| Hosting | Public **HTTPS** (Koyeb free / Oracle Always Free / or Fly paid-cheap) — not localhost |
| Deferred | Base / Coinbase CDP — post-challenge ADR only |
| Infra default | Try-order **Oracle Always Free → Koyeb Free → Fly ≤$5**; target ~$0 — see `40` |
| MVP scope | **Full Composite** (all routes in §D / OpenAPI) |
| Canary client | Algorand Foundation x402 demo — AgentCash only if needed |

Product semantics below (caps, session, credits, tenancy, SSRF) still apply unchanged.

---

## A. Identity & free routes

| Decision | Lock |
|----------|------|
| Tenant identity | Paying / proving wallet = `wallet_id` (`algo:<address>` for challenge; historically `base:<address>` deferred) |
| Free routes (Memory GET, Budget GET) | **Not anonymous.** Require wallet proof. |
| Free-route auth (v1) | After any **settled paid** call, mint **`X-AgentKeep-Session`** (opaque token). TTL **15 minutes**. Refresh on each successful paid call. **Always** return it as response header `X-AgentKeep-Session`; optional duplicate in JSON body. Free GETs accept session **or** a fresh wallet proof. |
| Cross-wallet | Always forbidden |

---

## B. Owner ops

| Decision | Lock |
|----------|------|
| Owner | First wallet that successfully settles any paid route |
| Channels v1 | **Email + Telegram** (both) |
| Bind email | `POST /v1/owner/bind/email` → magic link to `https://agentkeep.app/owner/confirm-email?token=` |
| Bind Telegram | `POST /v1/owner/bind/telegram` → bot deep link; **TTL 30 minutes** |
| Set caps | `PUT /v1/owner/caps` after **OTP to a bound channel** |
| Request OTP | `POST /v1/owner/otp` — **free**, rate limit **5 / hour / wallet** |
| Kill switch | `daily_cap_minor = 0` (hard) |
| Notify if unbound | `409` / `channel_not_bound` — agent **cannot** pass raw recipient |
| Delete data | `POST /v1/owner/delete` (OTP) — tombstone memory/inbox/artifacts metadata; **retain ledger** |

Prices: bind email/TG **$0.01** each once; caps update **$0.001**; OTP **$0**; delete **$0.01**.

---

## C. Money & caps

| Decision | Lock |
|----------|------|
| Cap mode | **Hard only** (no soft caps in v1) |
| Default daily cap | **$2.00 USDC** (2_000_000 minor) |
| Max self-serve raise | **$50.00 USDC / day** |
| Task budgets | **Deferred v1.1** — remove from v1 OpenAPI |
| Funding / size tiers | **Deferred** — single tier: memory 64 KiB, artifact 10 MiB |
| Failure after pay | Receipt `status: credited` = **spend offset** (reduces spent_today / applies to next paid call). Expire **7 days**. **No** on-chain refund, **no** withdrawable balance |
| Credit application | Apply `credit_minor` first; if route price > credit, x402 for **remainder only** |
| Variable pricing | **Flattened for v1** — see pricing |

---

## D. Pricing (v1 wire amounts)

Asset: USDC (Algorand ASA) · Network: `ALGORAND_Mainnet_CAIP2` (challenge) · Rail: x402 · Facilitator: GoPlausible · Mainnet  
Wire `money.network` string in JSON: use the CAIP2 network id above (not `base`).

| Route | Price |
|-------|-------|
| PUT /v1/memory/{key} | $0.001 |
| GET /v1/memory/{key} | $0 + session/proof |
| DELETE /v1/memory/{key} | $0.0005 |
| GET /v1/memory (list) | $0.001 / page |
| POST /v1/artifacts | **$0.005 + $0.002 × ceil(declared_max_bytes / 1MiB)** — client **must** send `max_bytes` / Content-Length; oversize → reject; undersize → no refund |
| GET artifact URL | $0 (public) |
| POST /v1/notify | $0.02 |
| GET /v1/notify/{id} | $0.0002 |
| GET /v1/inbox | $0.002 / page |
| POST /v1/inbox/{id}/ack | $0.0005 |
| GET /v1/budget | $0 + session/proof |
| GET /v1/budget/receipts | $0.002 / page |
| POST /v1/fetch | **$0.01 flat** (no egress surcharge) |
| GET /v1/trust | $0.002 |
| Owner bind / caps / delete | see §B |
| Owner OTP | **$0** (rate-limited) |

---

## E. Notify & callbacks

| Decision | Lock |
|----------|------|
| Human resolve | Email: magic links approve/deny + answer form. Telegram: inline Approve / Deny / Reply |
| Source of truth | **Poll** ticket status |
| `callback_url` | Optional; best-effort **one** HTTPS POST |
| Callback body | `{ ticket_id, status, answer_text, resolved_at }` |
| SSRF | HTTPS → DNS resolve → deny private/link-local/metadata → **no redirects** (or max 2 hops, re-validate IP each hop) → 3s → deny callbacks to `*.agentkeep.app` |
| Channel `both` | Still $0.02 once; deliver to all bound; if none bound → `channel_not_bound` |
| Rate | 10 create / wallet / hour |

---

## F. Inbox (v1 — ship, constrained)

| Decision | Lock |
|----------|------|
| Transport | **Inbound email only** (no agent webhook ingress) |
| Address | `{first8_of_wallet_hash}@inbox.agentkeep.app` stable per wallet |
| Provision | On first paid `GET /v1/inbox` |
| Attachments | **Strip**; note in body if omitted |
| Max body | 100 KiB text |
| Ingest cap | 100 messages / inbox / day; drop excess |
| No `POST /v1/inbox` create | Vision shorthand only — OpenAPI is source of truth |

---

## G. Artifacts

| Decision | Lock |
|----------|------|
| URL | `https://artifacts.agentkeep.app/{artifact_id}` (ULID) |
| Public | Yes |
| Dedup | sha256 **within wallet** only (idempotent re-upload) |
| Retention | 90 days then 404 — durable, **not** permanent |
| Types | Allow: image/*, application/json, text/*, application/pdf. Block: html, javascript, wasm, exe, zip bombs |
| Serving | Non-images: `Content-Disposition: attachment` |
| Upload quota | 50 / wallet / day |

---

## H. Trust probe

| Decision | Lock |
|----------|------|
| In v1 | **Yes** |
| Method | HEAD then GET if needed; timeout **3s**; read max **64 KiB** |
| SSRF | Same denylist as `/fetch` |
| `looks_x402` | HTTP 402 **and** body/headers parse as x402 challenge |
| Rate | 10 / min / wallet |

---

## I. Memory / retention

| Decision | Lock |
|----------|------|
| Max value | 64 KiB raw body bytes |
| Default TTL if omitted | **7 days** |
| Hard retention ceiling | 30 days |
| Artifacts / inbox / tickets / ledger | 90d / 30d / 90d / 24m+ |

---

## J. Rate limits (unified)

| Scope | Limit |
|-------|-------|
| Global / wallet | 120 rpm |
| Memory GET | 60 / min |
| Budget GET | 30 / min |
| Notify create | 10 / hour |
| Trust | 10 / min |
| Fetch | 30 rpm |
| Artifact upload | 20 rpm |

Return `429` + `rate_limited` + `Retry-After`.

---

## K. Payment verify details

| Decision | Lock |
|----------|------|
| Clock skew | ±60 seconds |
| Nonce TTL | 5 minutes |
| Resource binding | `METHOD path` + sha256(raw body) for mutating; GET = path+query |
| Overpay | Accept ≥ price; no refund of overpay |
| Pause switch | Ops can force `payment_unavailable` |

---

## L. Explicitly deferred (do not build in v1)

- MPP rail, multi-chain, Avalanche/Solana  
- Soft caps, task budgets, funding tiers  
- Soft delete zip export, dashboard  
- Malware AV scan, signed artifact URLs  
- Agent webhook → inbox  
- Owner signed rebind / multi-owner teams  

---

### M. Still open (ops — phased)

- [ ] H0: Algorand Testnet/Mainnet payTo + USDC ASA opt-in (see `27`)  
- [ ] Exact GoPlausible / x402-avm header names (spike H1 → patch OpenAPI)  
- [ ] Host: **Fly.io** (locked) — do not use Render  
- [ ] DB/KV/blob: Neon + R2 (locked in `25`)  
- [ ] **P12 / post-H4:** Purchase `agentkeep.app` + DNS (only after Mainnet canary)  
- [ ] Mainnet payTo funding for canary (never rotate during challenge)  
- [ ] abuse@ contact + status URL (at launch)

Domains are **explicitly deferred** until after staging acceptance (`docs/24`).
