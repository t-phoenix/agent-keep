# 27 — Algorand Global x402 Challenge (eligibility & product fit)

**Status:** Active — hackathon track (docs only; no app code yet)  
**Official pages:**  
- Challenge hub: [Global x402 Challenge](https://algorand.co/global-x402-challenge)  
- Build & submit guide: [How to build & submit your entry](https://algorand.co/blog/the-x402-global-challenge-is-live-how-to-build-submit-your-entry)  
**Prize pools:** $100K USD (top 5 finals) + 500K ALGO (top 20 leaderboard)  
**Hard dates (from Algorand):** Submission form **live through September 30**; usage measured through early October (unannounced window); finals early November.

This document **overrides** Base/CDP payment locks in `21` / `10` **for the challenge track**. Post-hackathon multi-rail (Base) may return via ADR.

---

## 1. Entry type for AgentKeep — **Composite**

| Type | Fit | Decision |
|------|-----|----------|
| Standard (1 endpoint) | Too narrow for our OS wedge | No |
| **Composite (many endpoints, one payTo)** | Matches memory / artifacts / notify / inbox / budget / fetch / trust | **Yes — locked** |
| Orchestrator (pay others downstream) | Not our v1 product | No |

**Composite rules we must obey** ([official guide](https://algorand.co/blog/the-x402-global-challenge-is-live-how-to-build-submit-your-entry)):

1. All paid routes share **one** Mainnet `payTo` address (leaderboard rolls up).  
2. Every route is its own resource with its **own price + concrete description**.  
3. **One root domain** for the merchant (never put different domains under the same payTo).  
4. Enable **Bazaar** discovery **once** on the server; declare discovery per route.  
5. Tag every challenge with **`x402-global-challenge`**.  
6. Facilitator = **GoPlausible only** (not CDP, not a local facilitator).

---

## 2. Payment stack (challenge-locked)

| Item | Value | Source |
|------|-------|--------|
| Protocol | x402 | Challenge |
| Facilitator | **GoPlausible** | Challenge (required for leaderboard) |
| Network Testnet | `ALGORAND_Testnet_CAIP2` | Challenge |
| Network Mainnet | `ALGORAND_Mainnet_CAIP2` | Challenge |
| USDC Testnet ASA | **10458941** | Challenge + [Circle USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses) |
| USDC Mainnet ASA | **31566704** | Challenge + Circle |
| Tenant id | `algo:<address>` (canonical lowercase) | AgentKeep amendment |
| Wallet identity | Paying Algorand address from settled proof | AgentKeep |

**Explicitly not used for challenge scoring:** Coinbase CDP / Base USDC (deferred post-hackathon).

---

## 3. Eligibility checklist → AgentKeep mapping

Copy this into the tracking board; do not claim “ready” until every ☑ is real.

### 3.1 Build

| # | Official requirement | AgentKeep action | Owner |
|---|----------------------|------------------|-------|
| B1 | Paid x402 API on Algorand | All paid `/v1/*` routes return 402 unpaid | Eng |
| B2 | Real service worth paying for | Continuity OS (memory, artifacts, notify, budget, fetch, trust…) | Product |
| B3 | HTTP 402 without payment | Shared payment middleware | Eng |

### 3.2 Testnet first

| # | Requirement | AgentKeep action | Owner |
|---|-------------|------------------|-------|
| T1 | Full flow on Testnet | `PAYMENT_NETWORK=testnet` deploy | Eng + Human |
| T2 | Network + ASA + payTo opted-in | Config + Pera/dispenser funding | 👤 Human |
| T3 | GoPlausible on Testnet | Same facilitator URL; testnet asset | Eng |
| T4 | Testnet ≠ leaderboard | Do not expect ranking from test txs | Ops |

### 3.3 Mainnet go-live

| # | Requirement | AgentKeep action | Owner |
|---|-------------|------------------|-------|
| M1 | Mainnet config flip | `ALGORAND_Mainnet_CAIP2` + ASA `31566704` | Eng |
| M2 | Public **HTTPS** (not localhost) | Fly.io ephemeral or custom domain | 👤 + Eng |
| M3 | Mainnet payTo | One Algorand address for whole competition | 👤 Human |
| M4 | payTo opted into USDC ASA 31566704 | Pera / AlgoKit opt-in | 👤 Human |
| M5 | **Same payTo forever** during competition | Never rotate mid-challenge | 👤 Human |

### 3.4 GoPlausible + Bazaar + tag

| # | Requirement | AgentKeep action | Owner |
|---|-------------|------------------|-------|
| G1 | Settle via GoPlausible only | Facilitator adapter = GoPlausible | Eng |
| G2 | Resource server on a domain | Public Fly URL / later `api.agentkeep.app` | 👤 |
| G3 | Bazaar discovery extension enabled | Once on server | Eng |
| G4 | Tag `x402-global-challenge` in x402 `extra` | Every paid route challenge | Eng |
| G5 | Concrete route **descriptions** | OpenAPI + middleware (what caller gets) | Product |
| G6 | Site metadata / llms / logo for merchant page | `discovery/` + landing | Eng |
| G7 | Optional NFD for merchant enrichment | Nice-to-have | 👤 |

### 3.5 Prove settlement

| # | Requirement | AgentKeep action | Owner |
|---|-------------|------------------|-------|
| P1 | ≥1 real Mainnet payment E2E | Canary wallet pays `PUT /memory` or `POST /fetch` | 👤 |
| P2 | Paid response returned | 200 + body + receipt | Eng |
| P3 | USDC lands in payTo | Explorer check ASA 31566704 | 👤 |
| P4 | Visible on leaderboard (hackathon filter ON) | Screenshot + note | 👤 |
| P5 | Appears in Bazaar catalog under challenge tag | Verify in Bazaar UI/API | 👤 |

### 3.6 Drive usage (through early October)

| # | Requirement | AgentKeep action | Owner |
|---|-------------|------------------|-------|
| U1 | Real users / volume | Pilot wallets + skill distribution + scanner | GTM `26` + 👤 |
| U2 | Unannounced October measurement window | Keep uptime; don’t pause for “polish” | Ops |

### 3.7 Submit (deadline **September 30**)

| # | Requirement | AgentKeep action | Owner |
|---|-------------|------------------|-------|
| S1 | Challenge submission form | [Submit form](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA) — Composite, describe OS primitives | 👤 |
| S2 | Public GitHub → Electric Capital | Public repo + Algorand x402 code | 👤 |
| S3 | Keep promoting after submit | Usage plan in `28` | 👤 |

Official rules disclaimer applies — see challenge site; we are an independent entrant.

---

## 4. Which endpoints count (Composite inventory)

Every **paid** route below shares one `payTo`. Free routes (session Memory GET / Budget GET) do **not** need a 402 for leaderboard volume but must not break tenancy.

| Route | Paid? | Bazaar description (draft — make concrete in OpenAPI) |
|-------|-------|--------------------------------------------------------|
| `PUT /v1/memory/{key}` | Yes $0.001 | Store up to 64KiB wallet-scoped value; returns key metadata + receipt |
| `DELETE /v1/memory/{key}` | Yes $0.0005 | Delete wallet-scoped key |
| `GET /v1/memory` (list) | Yes $0.001 | List keys (no values) for paying wallet |
| `GET /v1/memory/{key}` | Free+session | — |
| `POST /v1/artifacts` | Yes | Upload bytes; returns public HTTPS URL + sha256 |
| `POST /v1/notify` | Yes $0.02 | Create human approve/deny/answer ticket |
| `GET /v1/notify/{id}` | Yes $0.0002 | Poll ticket status |
| `GET /v1/inbox` | Yes $0.002 | List inbound messages + inbox address |
| `POST /v1/inbox/{id}/ack` | Yes $0.0005 | Mark message read |
| `GET /v1/budget` | Free+session | — |
| `GET /v1/budget/receipts` | Yes $0.002 | Export ledger receipts page |
| `POST /v1/fetch` | Yes $0.01 | URL → markdown/text, SSRF-safe |
| `GET /v1/trust` | Yes $0.002 | Probe URL for reachability / x402 signals |
| Owner bind/caps/delete | Yes (small) | Owner channel bind / hard caps / delete |

**Hackathon MVP cut (if timeboxed):** ship Composite with **memory + fetch + budget receipts + artifacts** first (high call frequency), then notify/inbox. Still one payTo.

---

## 5. Human ops unique to Algorand track

### 👤 H-ALGO-1 — Create Mainnet + Testnet accounts
1. Install [Pera Wallet](https://perawallet.app/) (or AlgoKit-managed account).  
2. Create **Testnet** account → fund ALGO + USDC ASA `10458941` from dispensers.  
3. Create **Mainnet** `payTo` account (competition receive address — never rotate).  
4. Opt-in Mainnet USDC ASA **31566704**.  
5. Fund small ALGO for opt-in/fees + seed canary USDC.  
6. Store address (not seed) as `PAYTO_ADDRESS` / `ALGORAND_PAYTO`.  
7. Optional: register **NFD** for merchant metadata enrichment.

### 👤 H-ALGO-2 — Canary payer wallet
1. Separate Testnet + Mainnet wallets for paying (not payTo).  
2. Fund Testnet USDC for free testing.  
3. Fund Mainnet USDC ($10–30) for leaderboard volume.

### 👤 H-ALGO-3 — First Mainnet settlement proof
1. Call unpaid route → capture 402.  
2. Pay via GoPlausible / Algorand x402 client (`x402-avm` / AgentCash if it supports Algorand — verify; else official demo client).  
3. Confirm 200 + USDC in payTo on explorer.  
4. Confirm Bazaar + leaderboard (hackathon filter).  
5. Screenshot for submission packet.

### 👤 H-ALGO-4 — Submissions
1. Fill challenge form by **Sept 30** (Composite; list endpoints; usage plan).  
2. Make GitHub **public**; submit to Electric Capital (watch their tutorial video from the guide).  
3. Keep driving usage through October.

---

## 6. Client / tooling notes

| Tool | Use |
|------|-----|
| Algorand Foundation x402 demo server/client | Reference implementation (flip Testnet→Mainnet) |
| Algorand agent skills (TS/Python x402) | AI coding assistants |
| GoPlausible Algorand plugins | Ops + x402 expertise |
| AgentCash | Prefer for agent-side paid calls **if** Algorand rail supported in your AgentCash build; otherwise use official Algorand x402 client / `x402-avm` |
| Circle docs | Confirm USDC ASA IDs only — Circle is **not** the challenge facilitator |

---

## 7. Conflict resolution

| Doc | Wins for |
|-----|----------|
| **This file (`27`)** | Challenge eligibility, Algorand network, GoPlausible, Composite rules, deadlines |
| `21` | Product semantics (caps, session, tenancy) except network/facilitator |
| `28` | Day-by-day impl/test/prod execution |
| `25` | Infra vendors (Fly/Neon/R2 — **not** Render) |

---

## Related

- Roadmap: [`28-hackathon-impl-test-prod-roadmap.md`](28-hackathon-impl-test-prod-roadmap.md)  
- Gap audit: [`29-doc-gap-audit.md`](29-doc-gap-audit.md)  
- Payments: `10` (amended)  
- Infra: `25`  
