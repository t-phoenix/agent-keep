# 03 — Product Requirements Document (PRD)

## Summary

Ship **AgentKeep v1**: one paid HTTP origin exposing six agent OS primitives **plus `/trust`**, with **x402 (USDC on Base via Coinbase CDP)**, OpenAPI discovery, and wallet-scoped tenancy. No dashboard required for core loops. Fully separate brand from AgentCash / Stable*.

## Goals

1. An agent with a funded wallet can complete all six primitives in under 5 minutes with zero signup.  
2. Owners can set spend caps and export receipts.  
3. Discovery artifacts (`openapi`, `llms.txt`, `SKILL.md`) are sufficient for unprompted agent use.  
4. Unit economics positive at target prices after payment rails fees.

## Non-goals

See [05-non-goals.md](05-non-goals.md). Highlights: no orchestration UI, no LLM proxy, no enrichment/search, no trading.

---

## Personas

See [04-personas-jobs.md](04-personas-jobs.md).

---

## MVP feature requirements

### F1 — Identity & tenancy

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F1.1 | Paying wallet is the tenant ID | Same wallet sees its memory/artifacts; other wallets cannot |
| F1.2 | No email/password signup for agent API | Agent can call with only payment headers / 402 flow |
| F1.3 | First paying wallet becomes owner | Owner bind email+TG, caps via OTP, kill switch (cap=0) — see OpenAPI `/v1/owner/*` |
| F1.4 | Free GETs need session/proof | Memory/Budget GET never anonymous cross-tenant |

### F2 — Memory (KV)

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F2.1 | `PUT` key → value (bytes/string/JSON) | Round-trip GET returns exact value |
| F2.2 | `GET` key | 404 if missing |
| F2.3 | `DELETE` key | Subsequent GET 404 |
| F2.4 | Optional TTL | Key expires; GET 404 after TTL |
| F2.5 | Size limit 64 KiB/value (single tier v1) | Oversize → typed error |
| F2.7 | Default TTL 7d if omitted | Expiry enforced |
| F2.6 | List keys (prefix optional) | Paginated; does not return values by default |

### F3 — Artifacts

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F3.1 | Upload with declared max_bytes | Returns public `artifacts.agentkeep.app/{id}` + sha256 |
| F3.2 | Dedup within wallet by sha256 | Idempotent re-upload no double charge |
| F3.3 | Content-Type allowlisted | Block html/js/exe |
| F3.4 | Max size 10 MiB | Oversize rejected |
| F3.6 | Public HTTPS URLs; 90d retention | Not permanent; then 404 |
| F3.5 | Metadata: created_at, size, wallet_id (internal) | Not leaked cross-wallet |

### F4 — Notify (human escalation)

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F4.1 | `POST` question + channel + maxWait | Returns ticket id; pending state |
| F4.2 | Human can approve / deny / free-text answer | Agent polls and/or one-off `callback_url` |
| F4.3 | Timeout behavior | Explicit `status: timeout` (not silent fail) |
| F4.4 | Channels v1: **email and Telegram** | Owner-bound; agent may select channel |
| F4.5 | Optional one-off `callback_url` | SSRF-hardened; HTTPS only; private IPs blocked |
| F4.6 | Rate limits per wallet | Abuse cannot spam owner |

### F5 — Inbox

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F5.1 | Agent receives addressable inbox id | Stable per wallet or explicitly provisioned |
| F5.2 | `GET` messages (poll) | Unread filter; pagination |
| F5.3 | Mark read / ack | Idempotent |
| F5.4 | Inbound email only | `{hash8}@inbox.agentkeep.app` |
| F5.5 | Attachments stripped; body ≤100 KiB; 100 msgs/day | Documented |

### F6 — Budget & receipts

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F6.1 | Ledger every successful paid call | Receipt id, amount, path, timestamp |
| F6.2 | `GET` spend today / period | Accurate vs ledger |
| F6.3 | Per-day and optional per-task caps | Over cap → payment rejected before work |
| F6.4 | Export receipts (JSON) | Machine-readable; owner can audit |
| F6.5 | Hard caps only; default $2/day | Soft caps deferred |
| F6.6 | Credited receipts on post-pay failure | Spend offset 7d; visible on budget |

### F7 — Fetch (HTTP glue)

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F7.1 | URL → text/markdown extraction | Useful for HTML pages |
| F7.2 | Timeout + max bytes | No unbounded hang/download |
| F7.3 | Block private/link-local SSRF | SSRF tests pass |
| F7.4 | Optional headers (limited) | No arbitrary header smuggling to metadata endpoints |
| F7.5 | Return status, final URL, content-type, body | Structured JSON |

### F8 — Payments & discovery

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F8.1 | x402 challenge on paid routes (Base USDC, CDP) | Unpaid → 402 with pay instructions |
| F8.2 | OpenAPI published | Matches live routes |
| F8.3 | `llms.txt` + `SKILL.md` | Accurate prices/paths |
| F8.4 | List on x402scan | Listing checklist complete |

### F9 — Trust probe (v1)

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F9.1 | `GET /v1/trust?url=` | Returns reachability + whether target looks x402-payable; timed |

---

## Out of MVP (parked)

- Multi-wallet teams / org accounts  
- Full web dashboard (optional read-only later)  
- Video generation, enrichment, social search  
- Cross-agent shared memory  
- Guaranteed multi-year artifact retention without pricing tier  

---

## UX principles (API UX)

1. Idempotency keys on mutating paid calls where double-pay is possible  
2. Stable error `code` strings (see error catalog)  
3. Version prefix `/v1`  
4. All timestamps ISO-8601 UTC  
5. Money amounts in minor units + currency/asset field  

---

## Launch checklist (product)

- [ ] Name + domain locked  
- [ ] OpenAPI freeze  
- [ ] Pricing freeze  
- [ ] One happy-path agent script (manual) using only discovery docs  
- [ ] Owner can set cap + receive one notify  
- [ ] Abuse: SSRF + cross-wallet isolation tested  
- [ ] Scanner listing live  

---

## Locked product decisions

See [20-open-questions.md](20-open-questions.md). Summary: AgentKeep on `agentkeep.app`, x402+Base USDC+CDP, mainnet, first-use owner, email+Telegram, public artifacts, 6 endpoints+`/trust`, TypeScript, 2–3 week solid MVP.
