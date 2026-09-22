# AGENTS.md — AI instructions for building AgentKeep

You are building **AgentKeep**: a paid HTTP API (x402, **USDC on Algorand**, **GoPlausible** facilitator) that gives wallet agents memory, artifacts, notify, inbox, budget, fetch, and trust — **no signup**.

**Active track:** [Algorand Global x402 Challenge](https://algorand.co/global-x402-challenge) — **Composite** entry. See `docs/27` + `docs/28`. Base/CDP is deferred post-challenge.

This file is mandatory for any AI coding agent (Cursor, Codex, Claude, etc.).

---

## 1. Read before you write code

| Priority | Doc |
|----------|-----|
| 0 | [`docs/27-algorand-x402-challenge.md`](docs/27-algorand-x402-challenge.md) — eligibility (wins on rail/network/facilitator) |
| 0b | [`docs/28-hackathon-impl-test-prod-roadmap.md`](docs/28-hackathon-impl-test-prod-roadmap.md) — calendar H0–H8 |
| 1 | [`docs/21-prebuild-decisions.md`](docs/21-prebuild-decisions.md) — product law |
| 2 | [`specs/openapi.yaml`](specs/openapi.yaml) — HTTP contract |
| 3 | [`docs/24-engineering-build-plan.md`](docs/24-engineering-build-plan.md) — edge-case tables / classic phases |
| 3b | [`docs/25-cheap-infra-guide.md`](docs/25-cheap-infra-guide.md) — **Fly + Neon + R2** (no Render) |
| 4 | [`docs/13-error-catalog.md`](docs/13-error-catalog.md) — stable `error.code` |
| 5 | [`docs/11-security-threat-model.md`](docs/11-security-threat-model.md) — SSRF / tenancy |
| 6 | [`docs/22-flows-and-build-plan.md`](docs/22-flows-and-build-plan.md) — diagrams |
| 7 | [`docs/18-acceptance-test-plan.md`](docs/18-acceptance-test-plan.md) — launch bar |
| 8 | [`docs/29-doc-gap-audit.md`](docs/29-doc-gap-audit.md) — missing docs |

If docs conflict: **`27` (eligibility) > `21` > OpenAPI > `28` > `24`**.

---

## 2. How to work (MNC process)

### 2.1 One phase at a time

1. During the hackathon, follow **`28` phases H0–H8** (not classic P0–P12 calendar).  
2. If the phase has **👤 Human intervention**, paste those steps and **wait** for `H{N} human done` / `P{N} human done`.  
3. Implement **only** that phase’s 🤖 scope. Prefer **thin Composite** (memory + fetch + receipts) before Sept 30.  
4. Complete the phase **Definition of Done** before starting the next.  
5. If blocked on secrets/DNS/payTo/GoPlausible, mark `blocked_on_human` — do not invent fake production credentials.  
6. **Do not** implement Base/CDP paths for the challenge track.

### 2.2 Test-first for money and security

For payment / SSRF / tenancy / caps / credits:

1. Write failing unit/integration tests from the phase edge-case table (`24` or `28`).  
2. Implement until green.  
3. Add regression tests for every bug fix in the same change.

Never merge payment/SSRF/tenancy code without automated tests.

### 2.3 PR hygiene

- Small, phase-scoped diffs.  
- Title: `phase-H{N}: …` or `phase-N: …`.  
- CI must pass: lint, typecheck, unit, integration (as available).  
- Do not use `--no-verify`.  
- Do not commit `.env`, keys, or real `payTo` private keys / seeds.

### 2.4 Stack defaults (until ADRs say otherwise)

- **Language:** TypeScript (strict)  
- **API:** Hono or Fastify  
- **DB:** Postgres (**Neon**)  
- **Host:** **Fly.io** (not Render)  
- **Blob:** R2  
- **Payments:** GoPlausible + Algorand USDC ASA  
- **Tests:** Vitest  
- **No** dashboard SPA for core loops; minimal owner pages only  

---

## 3. Non-negotiable product rules

1. **Wallet tenancy** — never return another wallet’s memory/inbox/artifacts metadata. Cross-wallet miss → `404` (no leak). Tenant id = `algo:<address>`.  
2. **Fail closed** — bad payment, SSRF, oversize, unbound notify → typed errors from catalog.  
3. **Hard daily cap** — default $2 USDC; check **before** work; `budget_exceeded` = no side effects.  
4. **Free GETs are not public** — Memory GET / Budget GET need `X-AgentKeep-Session` or proof.  
5. **Session** — mint/refresh only on **settled** success; always set response header `X-AgentKeep-Session`.  
6. **Credits** — post-pay failure → ledger `credited`; apply credit first; 402 for remainder; no withdraw.  
7. **Notify** — owner-bound channels only; never accept agent-supplied recipient addresses.  
8. **Artifacts** — public URLs; allowlisted types; no HTML/JS execution.  
9. **SSRF** — shared denylist for `/fetch`, `/trust`, `callback_url` (DNS→IP, no private ranges).  
10. **Challenge** — GoPlausible only; tag `x402-global-challenge`; one Mainnet `payTo`; public HTTPS; Bazaar on.  
11. **No scope creep** — no MPP, soft caps, task budgets, funding tiers, AgentCash branding, multi-domain under one payTo.  

---

## 4. Error & response discipline

- Every error: `{ error: { code, message, request_id, details? } }` with **catalog codes only**.  
- Money: integer minor units; nested `money: { amount, decimals: 6, asset: "USDC", network: "ALGORAND_Mainnet_CAIP2" }` (or Testnet).  
- Paid success: ledger receipt + session header.  
- Async human flows: return immediately (`pending`); agents **poll** — never block HTTP for `max_wait_seconds`.

---

## 5. States you must handle explicitly

| Entity | Allowed states |
|--------|----------------|
| Ledger | `settled` \| `credited` \| `failed` |
| Notify ticket | `pending` → terminal `approved\|denied\|answered\|timeout\|cancelled` |
| Wallet | `active` \| `suspended` \| `banned` |
| Session | valid until `expires_at` (15m) |

### Timeouts / waits

| Path | Bound |
|------|-------|
| GoPlausible verify | ≤ ~10s then `payment_unavailable` |
| Fetch upstream | configured; typed `upstream_timeout` |
| Trust probe | ≤ 3s |
| Callback URL | ≤ 3s, best-effort, once |
| Notify max wait | enforced by **worker**, not request thread |

---

## 6. Security checklist (every PR touching these areas)

- [ ] Payment: replay nonce rejected  
- [ ] Cap: cannot overspend by parallel requests without lock  
- [ ] SSRF: table-driven tests still green  
- [ ] No memory/artifact/inbox values in logs  
- [ ] Owner tokens hashed at rest; single-use  
- [ ] Idempotency-Key does not double-charge  
- [ ] Wrong ASA / network rejected  
- [ ] Challenge tag present on paid 402s  

---

## 7. What to do when unsure

| Situation | Action |
|-----------|--------|
| Spec ambiguous | Cite `27` / `21` / OpenAPI; if still unclear, ask human — do not guess money semantics |
| Want new endpoint | Refuse until docs updated |
| GoPlausible API differs from OpenAPI headers | Spike; then patch OpenAPI + `10`/`27` in same PR as adapter |
| Schedule pressure | Thin Composite first; slip Trust → Inbox → second notify channel |
| Found bug in production path | Regression test + fix; consider `credited` if users lost value |

---

## 8. Suggested agent prompts (humans → AI)

**Start hackathon phase:**  
> Read AGENTS.md and docs/28 H{N} + docs/27. Implement only that phase. TDD for edge cases. Stop at DoD. Docs-only until I say start coding.

**Review:**  
> Review this PR against docs/27 eligibility and docs/21. List missing tests and security gaps. Do not expand scope.

**Bugfix:**  
> Reproduce with a failing test first. Fix. Confirm no double-charge / tenancy leak.

---

## 9. Out of scope for AI unless asked

- Purchasing domains / configuring DNS — **only after Mainnet canary / P12**  
- Creating real Fly, Neon, R2, Telegram, email accounts (human)  
- Storing or handling `payTo` private keys / seeds  
- Mainnet canary approval and public listing submit (human form)  
- Trademark or legal filings  
- Renaming the product  
- Implementing Base/CDP during the challenge  

**Do not ask the human to buy domains before post-H4.** Use Fly ephemeral HTTPS URL.

**Human reply cheatsheet:** `H{N} human done` / `P{N} human done` (see bottom of `24` / `28`).

---

## 10. Done means

A phase is done only when **its tests are green** and the **DoD checklist in `28` (or `24`)** is complete — not when “code exists.”  
Competition-ready means checklist in `27` §3 is fully ☑.
