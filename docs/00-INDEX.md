# AgentKeep — Documentation Index

**Product:** AgentKeep  
**Phase:** Pre-code — Algorand Global x402 Challenge track (docs only)  
**Folder:** `~/Desktop/AgentKeep`  
**Last updated:** 2026-09-21

This index is the map of every document required before writing production code.  
Read top-to-bottom for onboarding; jump by need when building.

---

## How to use this folder

1. **Hackathon first** → **`27`**, **`28`**, gap audit **`29`**
2. Naming + decision log → `02`, `20`, **`21`** (product law; rail overridden by `27`)
3. Vision + PRD + non-goals → `01`, `03`, `05`
4. Flows / architecture diagrams → **`22`**, `16`
5. Data model + OpenAPI + pricing + payments → `07`, `specs/`, `09`, `10`
6. Security / privacy / errors / acceptance → `11`, `12`, `13`, `18`
7. Discovery → `14`, `discovery/`
8. Re-audit → **`23`**
9. Engineering + infra + GTM → **`24`**, **`25`**, **`26`**, [`AGENTS.md`](../AGENTS.md)
10. Only then: ADRs → code (phase by phase per `28`)

**Rule:** If it isn’t in these docs, it isn’t in v1. **`27` wins** on challenge eligibility / Algorand rail. **`21` wins** on product semantics. **`28` + AGENTS.md** govern how code is written during the hackathon.

---

## Document set (required before code)

### A. Product & positioning

| # | Doc | Purpose | Status |
|---|-----|---------|--------|
| 01 | [Vision / one-pager](01-vision-one-pager.md) | What / why / who / wedge | Draft |
| 02 | [Naming & brand](02-naming-brand.md) | Name + domain intent locked (`agentkeep.app`) | **Locked** |
| 03 | [PRD](03-prd.md) | Features, acceptance criteria, MVP scope | Draft |
| 04 | [Personas & jobs-to-be-done](04-personas-jobs.md) | Agent vs owner vs operator | Draft |
| 05 | [Non-goals & anti-scope](05-non-goals.md) | What we explicitly will not build | Draft |
| 06 | [Competitive & category map](06-competitive-landscape.md) | Crowded vs underserved; differentiation | Draft |

### B. Specs (build against these)

| # | Doc | Purpose | Status |
|---|-----|---------|--------|
| 07 | [Data model](07-data-model.md) | Entities, keys, TTLs, tenancy | Draft |
| — | [`specs/openapi.yaml`](../specs/openapi.yaml) | Machine-readable API for agents + codegen | Draft (Algorand) |
| 08 | [API product notes](08-api-product-notes.md) | Path semantics, idempotency, pagination | Draft |
| 09 | [Pricing & unit economics](09-pricing-economics.md) | Per-endpoint prices, COGS, margins | Intent locked |
| 10 | [Payments: x402](10-payments-x402-mpp.md) | x402 + GoPlausible + Algorand USDC | **Amended** |
| 13 | [Error catalog](13-error-catalog.md) | Stable error codes agents can branch on | Draft |

### C. Trust, safety, ops

| # | Doc | Purpose | Status |
|---|-----|---------|--------|
| 11 | [Security & threat model](11-security-threat-model.md) | Abuse, wallet spoofing, data isolation | Draft |
| 12 | [Privacy, compliance, retention](12-privacy-compliance.md) | PII in inbox/notify, retention, export/delete | Draft |
| 15 | [Success metrics](15-success-metrics.md) | What “working” means (call volume ≠ revenue) | Draft |
| 16 | [Architecture overview](16-architecture-overview.md) | System boxes + hostnames | Aligned |
| 17 | [ADR process](adr/README.md) + ADRs | Stack ADRs at code start | Template ready |
| 18 | [Acceptance & test plan](18-acceptance-test-plan.md) | Black-box MVP done | Updated |
| 19 | [Ops runbook outline](19-ops-runbook-outline.md) | Incidents, keys, deploys | Outline |

### D. Agent discovery & GTM docs

| # | Doc | Purpose | Status |
|---|-----|---------|--------|
| 14 | [Discovery package](14-discovery-package.md) | llms.txt, skill.md, scanners | Draft |
| — | [`discovery/llms.txt`](discovery/llms.txt) | Agent-readable summary | Aligned |
| — | [`discovery/SKILL.md`](discovery/SKILL.md) | How agents call AgentKeep | Aligned |

### E. Process & audits

| # | Doc | Purpose | Status |
|---|-----|---------|--------|
| 20 | [Open questions](20-open-questions.md) | Brand/rail decision log | Core locked |
| 21 | [Pre-build decisions](21-prebuild-decisions.md) | Audit fixes — **product source of truth** | **Locked** + A0 hackathon |
| 22 | [Flows & build plan](22-flows-and-build-plan.md) | Architecture + user + build diagrams | **Locked** |
| 23 | [Re-audit after freeze](23-re-audit.md) | Remaining gaps check | Active |
| 24 | [Engineering build plan](24-engineering-build-plan.md) | Phases, tests, edge cases, DoD | **Locked** (calendar → `28`) |
| 25 | [Cheap infra guide](25-cheap-infra-guide.md) | **Fly + Neon + R2** (no Render) | **Amended** |
| 26 | [Users, competition, GTM & validation](26-users-competition-gtm-validation.md) | Who pays, pilot money gates, sales/marketing | **Locked** |

### F. Algorand Global x402 Challenge (active)

| # | Doc | Purpose | Status |
|---|-----|---------|--------|
| 27 | [Challenge eligibility](27-algorand-x402-challenge.md) | Checklist → AgentKeep; Composite; GoPlausible; ASA IDs | **Locked** |
| 28 | [Impl → test → prod roadmap](28-hackathon-impl-test-prod-roadmap.md) | H0–H8 detailed steps to Sept 30 + October | **Locked** |
| 29 | [Doc gap audit](29-doc-gap-audit.md) | What’s missing vs required | **Active** |
| 30 | [GoPlausible adapter](30-goplausible-facilitator-adapter.md) | Facilitator contract (pre-code) | Stub |
| 31 | [Algorand tenancy](31-algorand-wallet-tenancy.md) | `algo:` identity rules | Stub |
| 32 | [Submission packet](32-challenge-submission-packet.md) | Form + Electric Capital answers | Stub |
| 33 | [Env & secrets matrix](33-env-and-secrets-matrix.md) | Every env var + where it lives | Stub |
| 40 | [Human setup checklist](40-human-setup-checklist.md) | Wallets, GitHub, infra try-order | **Active** |
| 45 | [Hackathon completion checklist](45-hackathon-completion-checklist.md) | Form, Electric Capital, domain timing, brand/site | **Active** |
| 46 | [Domain agentkeep.online](46-domain-agentkeep-online.md) | Namecheap → Cloudflare Pages + API cutover | **Active** |
| brand | [Brand guidelines](brand/guidelines.md) | Logo, color, voice, motion | **Active** |
| 40b | [Oracle create-instance form](40b-oracle-create-instance-form.md) | Field picks (if Oracle works) | Reference |
| 40c | [Easy free host — Cloud Run](40c-easy-free-host-cloudrun.md) | Preferred host when Oracle/Koyeb blocked | **Active** |
| 41 | [Dev & deploy](41-dev-and-deploy.md) | Local run, tests, Cloud Run | **Active** |
| 42 | [Audit & forward plan](42-audit-and-forward-plan.md) | Gaps, prod env, git init | **Active** |
| 43 | [Infra: Neon + GCP guide](43-infra-neon-gcp-guide.md) | Neon done · Cloud Run overview | **Active** |
| 44 | [GCP dashboard: credentials & local env](44-gcp-dashboard-credentials-env.md) | Secret Manager · Run · copy to `.env` | **Active** |
| — | [`AGENTS.md`](../AGENTS.md) | AI coding agent protocol | **Amended** |
| — | [Templates](templates/README.md) | PRD / ADR / RFC templates | Ready |

**Still recommended (not yet written):** see `29` §3 — canary ops, Bazaar metadata, Mainnet cutover runbook, Official Rules digest, finals demo script.

---

## Document types explained (why each exists)

| Type | Audience | When written | Failure if missing |
|------|----------|--------------|--------------------|
| Vision one-pager | You, partners, future self | Day 0 | Drift into “another wrapper” |
| Naming / brand | Humans + agent crawlers | Day 0 | Confusing origin on MPPScan |
| PRD | Builders | Before API freeze | Scope creep mid-build |
| Personas / JTBD | Product | Before PRD lock | Wrong UX (dashboard vs JSON) |
| Non-goals | Everyone | With PRD | Accidental SaaS features |
| Competitive map | Strategy | Early | Build crowded commodity |
| Data model | Backend | Before schema | Tenancy bugs = trust death |
| OpenAPI | Agents, clients | Before code | Agents can’t discover/pay |
| Pricing doc | Finance + product | Before list on scanners | Unprofitable high-WTP miss |
| Payments spec | Protocol | Before billing code | Broken 402 / double-charge |
| Threat model | Security | Before public pay | Abuse drains / data leaks |
| Privacy / retention | Legal-ish / trust | Before inbox/notify | Owner distrust |
| Error catalog | Agent authors | With OpenAPI | Fragile agent branches |
| Discovery (llms/skill) | Agents | Before marketing | Zero organic agent traffic |
| Metrics | Ops | Launch week | Optimize call volume not WTP |
| Architecture + ADRs | Engineers | After product freeze | Rewrite loops |
| Acceptance tests | QA / you | Before “shipped” | Soft launch that isn’t |
| Ops runbook | On-call | Before real money | Panic on first incident |

---

## Suggested freeze order (gates)

```
Naming lock (done)
    → 21 pre-build decisions (done)
        → OpenAPI 0.3 + flows/architecture (done)
            → Re-audit 23 (done)
                → Engineering plan 24 + AGENTS.md (done)
                    → P0 accounts (no DNS) → P1…
                        → … → P12 buy domains + DNS cutover → LIVE
```

---

## Explicitly deferred (post-v1 docs)

- Full brand kit / logo system
- Partner / affiliate agreements
- Multi-region DR plan
- Formal SOC2 / legal entity pack
- Public status page copy
- Sales deck (this is agent-native; deck is optional)
