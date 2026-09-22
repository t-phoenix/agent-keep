# 28 — Hackathon implementation → test → production roadmap

**Status:** Active execution plan (docs only until human says start coding)  
**Authority:** `27` (eligibility) > `21` (product) > OpenAPI > this file > `24`  
**Calendar reality:** Submission deadline **September 30**; today-ish mid/late September → **collapse P0–P12 into a sprint**. Prefer shipping a **thin Composite** that passes the checklist over a perfect 6-endpoint OS.

Companion: [`27-algorand-x402-challenge.md`](27-algorand-x402-challenge.md)

---

## 0. North-star definition of “competition-ready”

All of the following are true:

1. Public HTTPS Composite resource server on Algorand Mainnet.  
2. GoPlausible facilitator + Bazaar + tag `x402-global-challenge`.  
3. One Mainnet `payTo` opted into USDC ASA `31566704`.  
4. ≥1 real Mainnet settlement; USDC visible; paid response returned.  
5. Endpoint(s) on Bazaar + leaderboard (hackathon filter).  
6. Challenge form submitted + GitHub on Electric Capital.  
7. Usage plan running through early October.

---

## 1. Phased roadmap overview

| Phase | Name | Goal | Exit gate |
|-------|------|------|-----------|
| **H0** | Decisions & secrets | Locks, accounts, env names | `H0 human done` |
| **H1** | Skeleton + Algorand x402 spike | 402 → pay → settle → 200 on **one** route (Testnet) | Integration test green |
| **H2** | Thin Composite MVP | Memory + Fetch (+ Budget receipts) + shared middleware | DoD below |
| **H3** | Hardening | Caps, session, SSRF, credits, tenancy tests | Security suite green |
| **H4** | Staging Mainnet | Public Fly HTTPS, real payTo, first Mainnet settle | Checklist P1–P5 |
| **H5** | Submit + discoverability | Form, Electric Capital, Bazaar polish | Form ACK + repo public |
| **H6** | Usage & ops | Volume through October, monitoring | Daily canary green |
| **H7** | Expand Composite | Notify, inbox, artifacts, trust | Extra volume + demo |
| **H8** | Finals prep | Narrative, metrics, livestream | Deck ready |

Phases H0–H5 must complete **before Sept 30**. H6–H8 run after.

Map to old `24` phases: H1≈P1–P3 (Algorand not CDP), H2≈P4–P5, H3≈P3/P6 security, H4≈P11 staging without custom DNS, H5≈new, H7≈P7–P10, custom domains ≈P12 after volume.

---

## 2. H0 — Decisions, accounts, env (docs + human)

### 🤖 Agent
- [ ] Confirm **full MVP** Composite inventory in `27` §4 / `40` §5 (all routes).  
- [ ] Freeze env var names in `.env.example` (no secrets committed).  
- [ ] OpenAPI `money.network` = Algorand CAIP2.  
- [ ] Stub facilitator interface `VerifySettle` for GoPlausible (Foundation patterns).  
- [ ] Canary client = **Algorand Foundation** x402 demo — not AgentCash.

### 👤 Human intervention — paste & wait for `H0 human done`
Follow the full checklist: [`40-human-setup-checklist.md`](40-human-setup-checklist.md).

Short version:
1. Algorand Testnet + Mainnet payTo + canary payers (`40` §3).  
2. Infra try-order: **Oracle → Koyeb → Fly** (`40` §1); Neon + R2 + Resend.  
3. Public GitHub repo (`40` §2).  
4. Non-secret notes: payTo, `PUBLIC_API_BASE`, GitHub URL.  
5. Foundation client for canaries — AgentCash only if needed later.

**Env names (example only):**
```
PAYMENT_FACILITATOR=goplausible
PAYMENT_NETWORK=ALGORAND_Testnet_CAIP2|ALGORAND_Mainnet_CAIP2
USDC_ASA_ID=10458941|31566704
PAYTO_ADDRESS=
FACILITATOR_URL=   # GoPlausible official URL from docs
DATABASE_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
ARTIFACTS_PUBLIC_BASE=
PUBLIC_API_BASE=
OWNER_WEB_BASE=
SESSION_HMAC_SECRET=
```

---

## 3. H1 — Skeleton + Algorand x402 spike (Testnet)

**Goal:** One route proves the money path before product features.

### Steps (detailed)
1. Scaffold TS monorepo / app (`apps/api`): Hono or Fastify, Vitest, strict TS.  
2. Health: `GET /healthz` → 200.  
3. Add GoPlausible facilitator client (verify + settle) from Algorand x402 examples / agent skills.  
4. Implement `paymentMiddleware` for **one** route e.g. `PUT /v1/memory/demo`.  
5. Unpaid → **402** with challenge matching Algorand CAIP2 + ASA + payTo + price.  
6. Paid → settle → **200** JSON + ledger row `settled`.  
7. Unit-test: malformed proof → catalog error; replay nonce → reject.  
8. Manual Testnet canary with Foundation client or AgentCash.

### Edge-case tests (write failing first)
| Case | Expect |
|------|--------|
| No payment header | 402 |
| Wrong network / ASA | typed payment error |
| Wrong payTo | reject |
| Replay same proof | reject |
| Facilitator timeout >10s | `payment_unavailable` |
| Settled success | ledger `settled` + session header |

### DoD
- [ ] Testnet E2E script documented in `docs/ops`.  
- [ ] CI runs unit tests.  
- [ ] Screenshot of Testnet settle saved for team.

### 👤 Human
- Fund Testnet payTo + payer; confirm ASA opt-in.  
- Reply `H1 human done` after first Testnet settle.

---

## 4. H2 — Thin Composite MVP (product surface)

### Implement (order)
1. **Wallet tenancy** — resolve `algo:<addr>` from settled proof; cross-wallet → 404.  
2. **Memory** PUT/GET/list/DELETE with size limits (64KiB).  
3. **Session** mint on settled success; Memory GET / Budget GET require session or proof.  
4. **Hard daily cap** $2 USDC default — check **before** work; lock for parallel requests.  
5. **Fetch** POST with shared SSRF guard.  
6. **Budget receipts** GET (paid).  
7. **Composite x402 config** — each route price + description + tag + Bazaar discovery.  
8. **Ledger** states: `settled | credited | failed`.  
9. **Idempotency-Key** no double-charge.

### Bazaar descriptions (must be concrete)
- Memory PUT: “Store a wallet-scoped key/value (≤64KiB); returns metadata and payment receipt.”  
- Fetch: “Fetch a public HTTPS URL to markdown/text with SSRF protections; returns truncated body + receipt.”  
- Budget receipts: “Export recent settled/credited ledger rows for the paying wallet.”

### Tests
- Tenancy isolation matrix.  
- Cap exhaustion → `budget_exceeded`, no side effects.  
- SSRF table (private IPs, link-local, DNS rebinding stubs).  
- Free GET without session → 401/402 per catalog.  
- Composite: two routes same payTo both settle.

### DoD
- [ ] Thin routes live on Testnet public URL (Fly).  
- [ ] OpenAPI matches behavior.  
- [ ] Integration suite green in CI.

---

## 5. H3 — Hardening (money + security)

### Steps
1. Credits path: post-pay failure → `credited`; apply before next 402.  
2. Cap concurrency: transactional spend lock.  
3. Log hygiene: no memory values / artifact bytes.  
4. Owner email bind (minimal) if notify slipped — else stub.  
5. Rate limits / body size limits.  
6. Chaos: facilitator 5xx, DB down → typed errors.

### DoD
- [ ] Security checklist in `AGENTS.md` §6 checked.  
- [ ] Regression tests for every bug found in H2.

---

## 6. H4 — Staging Mainnet (production-shaped, still cheap)

### Infra (new free tiers — **not Render**)
| Layer | Vendor | Why |
|-------|--------|-----|
| API | **Fly.io** | New account free allowance; HTTPS; regions |
| DB | **Neon** serverless Postgres | New free project |
| Blobs | **Cloudflare R2** | Egress-friendly artifacts |
| Owner pages | **Cloudflare Pages** | Confirm email / notify resolve |
| Email | **Resend** | Transactional |
| DNS | Defer to post-submit (`P12`) | Use `*.fly.dev` / Pages URL until then |

### Steps
1. `fly launch` + secrets from H0.  
2. Flip `PAYMENT_NETWORK=ALGORAND_Mainnet_CAIP2`, `USDC_ASA_ID=31566704`.  
3. Deploy; verify HTTPS.  
4. Enable Bazaar discovery + tag on all paid routes.  
5. 👤 First Mainnet payment (H-ALGO-3).  
6. Confirm USDC in payTo, Bazaar, leaderboard.  
7. Canary cron: unpaid 402 + paid settle every 15m.

### DoD = competition checklist items M1–M5, G1–G7, P1–P5.

---

## 7. H5 — Submit packet (before Sept 30)

### Steps
1. Fill [submission form](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA):  
   - Entry type: **Composite**  
   - What payment unlocks: list thin routes + planned expand  
   - Who pays: agent wallets / pilot list  
   - payTo + public HTTPS base  
2. Make GitHub public; include Algorand middleware + README “How to call”.  
3. Submit repo to **Electric Capital** (follow Algorand video tutorial).  
4. Attach screenshots: Mainnet settle, Bazaar listing, leaderboard row.  
5. Publish `discovery/llms.txt` + skill for agents.

### DoD
- [ ] Form confirmation email saved.  
- [ ] Electric Capital submit ACK.  
- [ ] Public repo URL in submission.

---

## 8. H6 — Drive usage (early October)

### Playbook (detailed)
1. **Internal canary** — scripted N paid calls/day from canary wallet (honest volume, not spam that violates Official Rules — stay within spirit; real service use).  
2. **Pilot agents** — 3–5 builders run AgentKeep skill in their loops (memory + fetch).  
3. **Discovery** — ensure Bazaar descriptions + challenge tag; share Discord Algorand + agent forums.  
4. **GTM from `26`** — scanner leads who already pay x402; pitch “continuity between paid calls”.  
5. **Uptime** — Fly autostart; alerts on canary fail (email/Telegram).  
6. **Do not** switch payTo or domain mid-window.  
7. **Measure** — daily USDC settled, tx count, unique payers (ops dashboard or SQL).

### Slip order if overloaded
Trust → Inbox → second notify channel → fancy owner UI (same as `24`).

---

## 9. H7 — Expand Composite (post-submit)

Order for volume + demo quality:
1. Artifacts (public R2 URLs) — high demo value.  
2. Notify (email first) — human-in-loop story for finals.  
3. Trust probe.  
4. Inbox.  
5. Telegram notify.

Each new route: price + description + tests + Mainnet canary once.

---

## 10. H8 — Finals prep (if top 50 → top 10)

1. Narrative: “Wallet OS for agents — memory/fetch/budget with hard caps, no signup.”  
2. Metrics: unique payers, settle success %, SSRF blocks, cap saves.  
3. Live demo script ≤5 minutes (pay → memory → fetch → receipt).  
4. Risk: facilitator outage plan; read-only status page.  
5. Legal: re-read Official Rules before livestream.

---

## 11. Day-level sprint calendar (example)

Assume **~9 days to Sept 30** — compress ruthlessly.

| Day | Focus |
|-----|--------|
| D0 | H0 humans: wallets, Fly, Neon, R2, Resend |
| D1 | H1 spike Testnet one-route settle |
| D2–D3 | H2 memory + session + cap + fetch |
| D4 | H3 security tests + credits |
| D5 | H4 Fly Mainnet deploy + first real settle |
| D6 | Bazaar/leaderboard verify + polish descriptions |
| D7 | H5 submit form + Electric Capital + public README |
| D8–D9 | Buffer / bugfix / usage scripts |
| Post | H6 volume + H7 expand |

If behind on D4: **cut notify/inbox/artifacts** from pre-submit scope; keep Memory+Fetch+Receipts Composite.

---

## 12. Testing matrix (summary)

| Layer | What | When |
|-------|------|------|
| Unit | Payment parse, cap math, SSRF, tenancy | Every PR |
| Integration | Testnet facilitator mock + real Testnet nightly | H1+ |
| E2E canary | Mainnet paid call | H4+ |
| Load | Parallel cap lock | H3 |
| Chaos | Facilitator down | H3 |
| Acceptance | `18` subset for shipped routes | H4 |

---

## 13. Production checklist (ops)

- [ ] Secrets only in Fly secrets / Neon — never git  
- [ ] Backups: Neon PITR on  
- [ ] R2 private write / public read via CDN URL  
- [ ] Error codes only from catalog `13`  
- [ ] Status: `/healthz` + canary  
- [ ] Incident: rotate session HMAC; **do not** rotate payTo during challenge  
- [ ] Domains/`agentkeep.app` only after Mainnet stable (`P12`)

---

## 14. AgentCash & Circle usage in this plan

| Need | Tool |
|------|------|
| Confirm USDC ASA IDs | Circle docs / Circle MCP if useful |
| Pay AgentKeep (or other) endpoints from agent | AgentCash `fetch` **if** Algorand supported; else Algorand x402 client |
| Discover competitor endpoints | AgentCash `discover_api_endpoints` / `search` |
| Cheap research / enrichment for pilots | AgentCash → stableenrich etc. (budget-aware) |
| Do **not** use Circle as challenge facilitator | GoPlausible only |

---

## 15. Stop / ask human

Stop and mark `blocked_on_human` when missing: Mainnet payTo, USDC opt-in, Fly/Neon/R2 credentials, first Mainnet settle confirmation, submission form access, Electric Capital submit access.

**Never invent production seeds or private keys.**

---

## Related

- Eligibility: `27`  
- Product law: `21`  
- Classic phases: `24` (still useful for edge-case tables)  
- Infra: `25`  
- GTM: `26`  
