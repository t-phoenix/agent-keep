# 20 — Open questions (decision log)

**Status:** Core brand/rail locked 2026-09-05.  
**Product semantics:** superseded/extended by [`21-prebuild-decisions.md`](21-prebuild-decisions.md) (2026-09-07).  
**Flows:** [`22-flows-and-build-plan.md`](22-flows-and-build-plan.md).

Use `21` for anything about identity, caps, credits, inbox, SSRF, pricing wire amounts.

---

## Decision log

| # | Topic | Decision | Date |
|---|-------|----------|------|
| 1 | Name | **AgentKeep** locked | 2026-09-05 |
| 2 | Domain | Prefer **`agentkeep.app`** (available). Also grab **`agentkeep.net`**. See domain check below. | 2026-09-05 |
| 3 | Trademark | Light concern only (“Keep” password apps). Proceed; avoid claiming vault/password category. | 2026-09-05 |
| 4 | Payment rail | **x402 primary**. MPP optional later if scanners need it — not launch-critical. | 2026-09-05 |
| 5 | Asset / network | **USDC on Base** only for v1 | 2026-09-05 |
| 6 | Facilitator | **Coinbase CDP / x402 stack** (reuse existing) | 2026-09-05 |
| 7 | Network env | **Straight to mainnet** with tiny spend caps + rate limits | 2026-09-05 |
| 8 | Owner bind | **First-use wallet = owner** (agentic x402 use) | 2026-09-05 |
| 9 | Notify channels | **Email + Telegram** both in v1 | 2026-09-05 |
| 10 | Callbacks | **One-off callback URLs allowed** (SSRF-hardened allowlist rules) | 2026-09-05 |
| 11 | MVP scope | **All 6 endpoints**, production-ready | 2026-09-05 |
| 12 | `/trust` | **Include in v1** | 2026-09-05 |
| 13 | Artifact URLs | **Public-by-default** | 2026-09-05 |
| 14 | Retention | Confirm: memory 30d, artifacts 90d, inbox 30d, ledger 24m+ | 2026-09-05 |
| 15 | Size limits | Defaults OK; **larger allowed when wallet has higher funding / paid tier** | 2026-09-05 |
| 16 | Memory GET price | **Free + hard rate limits** (see rationale below) | 2026-09-05 |
| 17 | Brand / AgentCash | **Fully separate** — no AgentCash / Stable* brand relation | 2026-09-05 |
| 18 | Horizon | **2–3 week solid origin** | 2026-09-05 |
| 19 | Compliance | Design for constraints below; no SOC2/HIPAA day one | 2026-09-05 |
| 20 | Host | Compare cheap paid plans (Render already used → no free tier there). Prefer **Fly or Cloudflare** for new origin; Render paid OK if ops simplicity wins. | 2026-09-05 |
| 21 | Language | **TypeScript** | 2026-09-05 |
| 22 | OpenAPI next | **Yes — tighten concrete draft** (still pre-code; not a hard freeze) | 2026-09-05 |

---

## Domain availability (checked 2026-09-05)

| Domain | Status | Notes |
|--------|--------|-------|
| `agentkeep.dev` | **Taken** | Spaceship NS; live A records |
| `agentkeep.com` | **Taken** | Porkbun (created 2025-03) |
| `agentkeep.io` | **Taken** | Cloudflare (created 2026-04) |
| `agentkeep.ai` | **Taken** | Cloudflare (created 2026-01) |
| `keep.tools` | **Taken** | Since 2019 |
| `agentkeep.xyz` | **Taken** | Afternic / aftermarket |
| **`agentkeep.app`** | **Available** (NXDOMAIN) | **Primary recommendation** |
| **`agentkeep.net`** | **Available** | Grab as API/backup |
| `agentkeep.org` | **Available** | Optional defensive |
| `agentkeep.co` | **Available** | Optional |
| `getagentkeep.com` | **Available** | Optional redirect |
| `useagentkeep.com` | **Available** | Optional redirect |

**Fixate:** Product name **AgentKeep**. Planned origin URLs:

- Docs / marketing: `https://agentkeep.app`
- API: `https://api.agentkeep.app`
- OpenAPI: `https://api.agentkeep.app/openapi.json`
- llms.txt: `https://agentkeep.app/llms.txt`

**Action (timing):** Re-check and register `agentkeep.app` + `agentkeep.net` at **P12 cutover** after staging tests pass — not before coding. Test on localhost / host ephemeral URLs first (`docs/24` Domain/DNS policy).

---

## #16 — Memory GET pricing (rationale)

| Option | Pros | Cons |
|--------|------|------|
| Free GET | Agents re-read mid-loop without 402 friction; matches “scratchpad” JTBD | Poll / scrape abuse |
| $0.0005 GET | Abuse harder; every call revenue | Extra 402 hops; feels taxy for continuity |
| Bundled with PUT | Simple accounting | Weird for GET-before-PUT patterns |

**Pick: free GET + hard per-wallet rate limits** (e.g. 60/min, burst 10).  
Same for **`GET /budget`** (trust feature).  
Keep **PUT / LIST / DELETE** paid.  
If abuse appears, flip GET to $0.0005 without changing path semantics.

---

## #19 — Compliance constraints to design for (ideation, not legal advice)

Even as a “few cents JSON” API, v1 should assume these constraints:

1. **Money transmission / crypto** — You settle USDC for digital services (not remitting for users). Still: clear ToS (“software/API access”), no custodial balances beyond prepaid credits if any, KYC only if a processor later requires it. Prefer **pay-per-call settle**, not stored customer balances.
2. **Consumer PII (email / Telegram)** — Notify + inbox create personal data. Need privacy policy, retention/delete, encryption at rest, subprocessors list. GDPR/CCPA-style export/delete even if you are not EU-first.
3. **Unsolicited messaging** — Email/Telegram notify can look like spam. Rate limits, owner-bound channels first, one-off callbacks SSRF-safe, unsubscribe / unbind.
4. **Public artifacts** — Assume crawlable / CSAM / malware risk. Content hashing, size caps, abuse reports, takedown path, optional malware scan later. Do not promise “private files.”
5. **SSRF / callback abuse** — `/fetch` and `callback_url` must block private IP ranges, metadata endpoints, redirects to internal hosts.
6. **Sanctions / OFAC** — Wallet-level screening is imperfect on-chain; at minimum refuse known bad patterns / geo blocks if host requires; document honesty limits.
7. **Minors / harmful content** — ToS ban illegal content in memory/artifacts/inbox; report path.
8. **Tax / entity** — USDC revenue is income; pick operating entity + record ledger exports (you already keep receipts 24m+).
9. **Not claiming** — No SOC2/HIPAA/PCI badges in v1. No “bank,” “custody,” or “password manager” positioning.
10. **Mainnet tiny caps** — Soft compliance control: daily caps default low until owner raises.

Document subprocessors when chosen: host, DB, object store, Resend/Postmark, Telegram Bot API, Coinbase CDP.

---

## #20 — Hosting comparison (cheap / paid)

Assumption: you already use Render elsewhere → **Render free tier unavailable** for another service on same footprint; compare paid floors.

| Host | Approx floor (2026) | Fit for AgentKeep | Notes |
|------|---------------------|-------------------|-------|
| **Cloudflare Workers + R2 + D1/KV** | Free tier usable; Paid ~**$5/mo** + storage | Strong if API fits Workers | Cheapest at volume; TypeScript-native; x402 verify may need careful Node compat — check CDP libs |
| **Fly.io** | ~**$5–15/mo** small always-on VM | Strong for Node/TS API + Redis/Postgres | Usage-based; good Docker; no shared free tier for new accounts |
| **Render paid** | Starter web ~**$7/mo** + DB; workspace Pro **$25/mo** if needed | OK if ops familiarity wins | Same mental model as your other apps; bandwidth metered on newer plans |
| **Railway** | Hobby ~**$5** credit / Pro **$20** | Fine for MVP | Usage can spike; watch bill |
| **Vercel** | Pro **$20/mo** + function usage | Weak for long `/fetch` / notify workers | Better for marketing site only |
| **AWS Lambda** | Free tier then cents | Flexible but ops-heavy | Overkill for 2–3 week origin |

**Recommendation for 2–3 week MVP:**

1. **Marketing/docs:** Cloudflare Pages or any static (free) on `agentkeep.app`
2. **API origin:** **Fly.io** (full Node/TS + Postgres/Redis) *or* **Render Starter (~$7)** if you want identical ops to existing apps
3. **Artifacts:** R2 or S3-compatible (Cloudflare R2 = no egress tax)
4. Revisit Workers only if CDP x402 verification runs cleanly on that runtime

Do **not** block on multi-region.

---

## Still open (non-blocking)

- [ ] Actually purchase `agentkeep.app` + `agentkeep.net`
- [ ] Exact Telegram bot UX (deep link vs chat id bind)
- [ ] Exact CDP package / header field names in OpenAPI security scheme
- [ ] Default daily cap amount on mainnet (suggest $1–5 USDC/day until raised)
- [ ] Host final pick (Fly vs Render Starter) — ADR at code start

---

## Historical questions (archived wording)

See git history for the original unanswered questionnaire. All A–G items above are decided or ideated.
