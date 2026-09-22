# 23 — Re-audit after decision freeze

**Date:** 2026-09-07  
**Inputs:** `21` locks applied across OpenAPI 0.3, data model, payments, pricing, PRD, discovery, acceptance, flows.  
**Question:** Is the plan solid enough to start week-1 ADRs + code, or do gaps remain?

---

## Verdict

**Solid enough to start Week 0–1 engineering prep** (domains, ADRs, CDP spike) — **not** yet “zero ambiguity forever.”  

Prior P0 holes (free-auth, owner APIs, hard caps, flat fetch, credits, SSRF, artifact host, inbox shape) are **closed in docs**. Remaining items are either **ops spikes**, **small consistency nits**, or **conscious scope risk** (wide MVP).

---

## Closed since last audit (confirmed)

| Prior P0 | Status |
|----------|--------|
| Free GET identity | Session 15m + proof — locked |
| Owner bind/caps/delete routes | In OpenAPI `/v1/owner/*` |
| Hard caps + $2 default | Locked |
| Variable fetch pricing | Flat $0.01 |
| Credits vs custody | Spend-offset `credited`, 7d |
| Inbox shape | Email-only, hash address, strip attachments |
| callback SSRF algorithm | Locked in `21` + security doc |
| `artifacts.agentkeep.dev` | → `.app` + ULID |
| Unbound notify | `channel_not_bound` |
| `/trust` contradiction | In v1 everywhere |
| Acceptance gaps | Extended in `18` |
| Build/arch/user diagrams | `22` |

---

## Remaining gaps (ranked)

### Still blocking production traffic (not blocking first code spike)

| # | Gap | Severity | Suggested action |
|---|-----|----------|------------------|
| R1 | Domains not purchased | **P12 cutover** (intentional) | Buy after staging `18` green — see `24` Domain/DNS policy |
| R2 | Exact CDP header set unknown | **P0 spike** | Day-1 spike; patch OpenAPI `securitySchemes` |
| R3 | payTo treasury address unset | **P0 ops** | Create Base USDC receive wallet; document rotation |
| R4 | Host/DB/KV/blob ADR unset | **P0 eng** | Pick Fly vs Render + Postgres + Redis/KV + R2 before schema migrations |
| R5 | Email provider + TG bot unset | **P0 ops** | Resend/Postmark + BotFather before notify ships |
| R6 | MX for `inbox.agentkeep.app` | **P1 ops** | DNS + inbound webhook; can trail memory/fetch |

### Product / spec nits (fix in docs before or during week 1)

| # | Gap | Severity | Suggested action |
|---|-----|----------|------------------|
| R7 | How is session returned — header only, body `session` field, or both? OpenAPI mixes `SessionInfo` on some responses | **P1** | **Lock:** always set response header `X-AgentKeep-Session` + optional body field on paid 200s |
| R8 | OTP request is paid ($0.0005) — friction for humans raising caps | **P2** | Accept for agents; or make OTP free with rate limit 5/hour — **prefer free OTP + rate limit** |
| R9 | Email magic-link confirm has no documented public path (`GET /v1/owner/bind/email/confirm?token=`) | **P1** | Add browser page on `agentkeep.app` (not paid API); document URL in `21` |
| R10 | Telegram bind race: deep_link expires — TTL not specified | **P2** | **Lock 30 minutes** |
| R11 | Credit application order vs partial credit (credit $0.003, route costs $0.01) | **P1** | **Lock:** apply credit first; 402 for remainder only |
| R12 | Concurrent requests: two pays while credit exists | **P2** | Atomic debit credit_minor in DB txn with ledger |
| R13 | `GET /v1/owner/otp` vs POST — only POST exists; skill mentions otp OK | **P2** | Keep POST |
| R14 | Human notify pages CSRF / token single-use not in acceptance | **P1** | Add tests: token single-use, expired token denied |
| R15 | Index still lists some docs as “Draft” while `21` locked | **P2** | Relabel PRD/vision “aligned” when convenient |
| R16 | ADR README still mentions x402/MPP undecided | **P2** | Update ADR list at code start |
| R17 | Non-goals doc may not mention deferred inbox webhook / MPP | **P2** | Add one line to `05` |
| R18 | Fetch `$0.01` vs habit band narrative still fine — confirm COGS later | **P2** | Fill COGS before scanner push |

### Scope risk (plan solid, schedule fragile)

| Risk | Mitigation already in `22` |
|------|----------------------------|
| Dual notify + inbox + trust in 3 weeks | Slip order: trust → inbox → second channel |
| Mainnet day one | $2 cap, pause switch, canary 48–72h |
| Public artifacts abuse | Allowlist + quotas + takedown — **no AV in v1** (accepted risk) |
| First-use owner key steal | Low default cap + OTP for raises — accepted |

---

## Is the plan solid?

| Dimension | Score | Note |
|-----------|-------|------|
| Product wedge clarity | High | Continuity OS, not enrichment |
| Money path clarity | High | x402/Base/CDP/hard caps/credits |
| Agent DX clarity | High | OpenAPI + session + skill |
| Owner DX clarity | Medium-high | Routes exist; confirm pages need URL lock (R9) |
| Abuse model | Medium-high | SSRF/caps/allowlist; AV deferred |
| 2–3 week realism | Medium | Achievable if slip order honored |
| Doc consistency | High | Residual nits R7–R18 |

**Recommendation:**  

1. ~~Patch micro-locks~~ — done in `21` / OpenAPI.  
2. CDP spike + P0 accounts (domains deferred).   
3. Start code on **Week 1 skeleton** (pay + session + memory + ledger) without waiting for inbox MX.  
4. Do **not** invent new features until acceptance `18` is green for that vertical slice.

---

## Optional micro-locks — **applied into `21` + OpenAPI**

| Item | Lock |
|------|------|
| R7 Session | Header always; body optional |
| R8 OTP | Free + 5/hour |
| R9 Confirm URL | `https://agentkeep.app/owner/confirm-email?token=` |
| R10 TG TTL | 30m |
| R11 Credits | Apply first; 402 remainder |

Remaining gaps are almost entirely **ops/ADR**, not product holes.

---

## Sign-off

| Check | Y/N |
|-------|-----|
| Ready for week-1 ADRs? | **Y** |
| Ready for public mainnet listing? | **N** (need R1–R5 + canary) |
| Ready to write app code for pay+memory vertical? | **Y** (after R7/R11 micro-lock preferred) |
