# 29 — Documentation gap audit (AgentKeep)

**Status:** Snapshot for Algorand Global x402 Challenge pivot  
**Method:** Inventory existing docs vs eligibility (`27`), roadmap (`28`), product law (`21`), and launch needs.

---

## 1. What we already have (keep)

| Doc | Role |
|-----|------|
| `00-INDEX` | Navigation |
| `01`–`09` | Vision, naming, PRD, personas, non-goals, competitive, data model, API notes, pricing |
| `10` | Payments (needs Algorand amendment) |
| `11`–`15` | Security, privacy, errors, discovery, metrics |
| `16`–`19` | Architecture, acceptance, ops, open questions |
| `21` | Prebuild decisions (network override via `27`) |
| `22`–`23` | Flows + re-audit |
| `24` | Engineering phases (still edge-case gold; calendar superseded by `28`) |
| `25` | Cheap infra (vendor list must exclude exhausted Render) |
| `26` | GTM / validation |
| `AGENTS.md` | AI operating protocol |
| `specs/openapi.yaml` | HTTP contract |
| `discovery/*` | Agent discovery stubs |
| `.cursor/rules/*` | Build rules |

---

## 2. Added this pivot (required)

| Doc | Why |
|-----|-----|
| **`27-algorand-x402-challenge.md`** | Eligibility checklist ↔ AgentKeep; Composite; GoPlausible; ASA IDs; human ops |
| **`28-hackathon-impl-test-prod-roadmap.md`** | Impl → test → prod day plan to Sept 30 + October usage |
| **`29-doc-gap-audit.md`** | This file |

---

## 3. Missing or thin documents (recommended next — still docs-only)

Priority: **P0** before coding · **P1** before Mainnet · **P2** before finals.

| Gap | Suggested doc | Priority | Notes |
|-----|---------------|----------|-------|
| GoPlausible adapter contract | `docs/30-goplausible-facilitator-adapter.md` | **P0** | **Stub written** — fill on H1 spike |
| Algorand identity & tenancy | `docs/31-algorand-wallet-tenancy.md` | **P0** | **Stub written** |
| Challenge submission packet | `docs/32-challenge-submission-packet.md` | **P0** | **Stub written** — fill before Sept 30 |
| Env & secrets matrix | `docs/33-env-and-secrets-matrix.md` | **P0** | **Stub written** |
| Canary & leaderboard ops | `docs/34-canary-and-leaderboard-ops.md` | **P1** | Scripts, cadence, what violates Official Rules spirit |
| Bazaar / merchant metadata | `docs/35-bazaar-merchant-metadata.md` | **P1** | Descriptions, logo, llms.txt, optional NFD |
| Post-hackathon multi-rail ADR | `adr/0001-multi-rail-base-after-challenge.md` | **P2** | How Base/CDP returns without breaking Algorand payTo history |
| Threat model delta | amend `11` or `docs/36-algorand-threat-delta.md` | **P1** | ASA opt-in, wrong network, facilitator trust, address spoofing |
| Runbook Mainnet cutover | `docs/37-mainnet-cutover-runbook.md` | **P1** | Flip checklist, rollback (without rotating payTo) |
| Demo script | `docs/38-finals-demo-script.md` | **P2** | 5-minute live path |
| Legal / rules digest | `docs/39-official-rules-digest.md` | **P1** | Human-readable must/must-not from Official Rules (link primary) |
| Data retention for challenge | amend `12` | **P2** | How long keep receipts for judging |

---

## 4. Documents that need amendment (not replace)

| Doc | Amendment |
|-----|-----------|
| `21-prebuild-decisions.md` | Network = Algorand for challenge; facilitator = GoPlausible; tenant = `algo:`; Base/CDP deferred |
| `10-payments-x402.md` | ASA IDs, CAIP2 strings, Composite payTo, Bazaar tag |
| `25-cheap-infra-guide.md` | **Lock Fly + Neon + R2 + Pages**; mark Render as **do not use** (free tier exhausted) |
| `24-engineering-build-plan.md` | Point top to `28` for calendar; keep edge-case tables |
| `specs/openapi.yaml` | `money.network` Algorand; remove Base-only assumptions in descriptions |
| `AGENTS.md` | Authority: `27`/`28` during hackathon; no CDP for challenge |
| `00-INDEX.md` | Link 27–29 + missing-doc list |
| `README.md` | One-liner: Algorand Global x402 Challenge Composite entry |
| `09-pricing.md` | Prices still USD minor units; settlement asset = Algorand USDC ASA |
| `16-architecture.md` | Facilitator box = GoPlausible; chain = Algorand |
| `18-acceptance-test-plan.md` | Add Mainnet settle + Bazaar visibility gates |
| `22-flows` | Payment sequence: Algorand proof headers (when known from spike) |

---

## 5. Explicitly out of scope for docs right now

- Trademark filings  
- Production seed storage procedures beyond “never commit”  
- Multi-chain soft caps / MPP / AgentCash branding  
- Buying `agentkeep.app` before Mainnet canary (`P12` / post-H4)

---

## 6. Verdict

| Question | Answer |
|----------|--------|
| Are we missing eligibility docs? | **Was yes → fixed by `27`** |
| Are we missing impl/test/prod roadmap? | **Was yes → fixed by `28`** |
| Are we missing anything else critical? | **P0 stubs now exist (`30`–`33`).** Still missing P1+: canary ops (`34`), Bazaar metadata (`35`), threat delta (`36`), Mainnet cutover (`37`), finals demo (`38`), Official Rules digest (`39`). |
| Infra doc gap? | **Fixed in `25`** — Fly + Neon locked; Render excluded. |

---

## Related

- [`27-algorand-x402-challenge.md`](27-algorand-x402-challenge.md)  
- [`28-hackathon-impl-test-prod-roadmap.md`](28-hackathon-impl-test-prod-roadmap.md)  
- [`00-INDEX.md`](00-INDEX.md)  
