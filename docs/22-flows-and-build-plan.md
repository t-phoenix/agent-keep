# 22 — Architecture, flows & build plan

High-level view for humans before code. Product locks live in [`21-prebuild-decisions.md`](21-prebuild-decisions.md).

**For implementation:** use the extensive phased plan [`24-engineering-build-plan.md`](24-engineering-build-plan.md) and AI protocol [`../AGENTS.md`](../AGENTS.md). This file stays the diagram-oriented overview.

---

## 1. Build flow (2–3 week solid origin)

```mermaid
flowchart LR
  subgraph W0["Week 0 — Docs freeze"]
    D1[21 decisions]
    D2[OpenAPI align]
    D3[Accounts only — domains later]
  end

  subgraph W1["Week 1 — Skeleton + money"]
    A1[ADR host/DB/blob]
    A2[TS API skeleton]
    A3[x402 + CDP verify]
    A4[Ledger + hard caps]
    A5[Session mint]
  end

  subgraph W2["Week 2 — Primitives"]
    B1[Memory]
    B2[Artifacts + CDN]
    B3[Fetch SSRF]
    B4[Budget + receipts]
    B5[Owner bind + notify]
  end

  subgraph W3["Week 3 — Close loops + ship"]
    C1[Inbox email]
    C2[Trust probe]
    C3[Staging acceptance]
    C4[Buy domains + DNS cutover]
    C5[Canary on final domain → x402scan]
  end

  W0 --> W1 --> W2 --> W3
```

### Week-by-week checklist

| Phase | Ship | Done when |
|-------|------|-----------|
| **0** | Decisions + OpenAPI + vendor accounts | `21` + OpenAPI match; CDP/payTo ready (**domains later**) |
| **1** | Pay path on staging host URL | Unpaid→402→pay→200; session works |
| **2** | Core primitives | Memory + artifacts + fetch + budget + one notify path |
| **3** | Second channel + inbox + trust + **domain cutover** | Staging `18` green → buy `agentkeep.app` → DNS → canary → list |

**Slip order (if behind):** cut `/trust` → cut inbox → ship single notify channel only → keep money+memory+artifacts+fetch+budget.  
**Domains/DNS:** only after staging acceptance (see `24` P12).

---

## 2. Architecture (logical)

```mermaid
flowchart TB
  Agent["Agent wallet + CDP"]
  Owner["Human owner\nemail / Telegram"]
  Edge["API Edge\nTypeScript /v1"]

  Pay["Payment verify\nx402 + CDP"]
  Sess["Session mint\nX-AgentKeep-Session"]
  Bud["Budget gate\nhard daily cap"]
  Led["Ledger DB\nsettled / credited"]

  Mem["Memory KV"]
  Art["Object store\nartifacts.agentkeep.app"]
  Fet["Fetch worker\nSSRF-safe"]
  Tru["Trust probe"]
  Nfy["Notify service"]
  Inb["Inbox ingress\nemail"]
  Own["Owner ops\nbind / caps / OTP"]

  Agent -->|HTTP + payment / session| Edge
  Edge --> Pay
  Pay --> Bud
  Bud --> Sess
  Bud --> Led
  Edge --> Mem
  Edge --> Art
  Edge --> Fet
  Edge --> Tru
  Edge --> Nfy
  Edge --> Inb
  Edge --> Own
  Nfy --> Owner
  Own --> Owner
  Inb -->|MX inbound| Inb
```

### Component notes

| Box | Job |
|-----|-----|
| API Edge | Route, validate, rate-limit, map wallet_id |
| Payment verify | CDP x402; bind resource/amount/nonce |
| Budget gate | Hard daily cap **before** work; apply credits |
| Session | 15m token for free GETs after paid settle |
| Ledger | Append-only receipts; `credited` offsets spend |
| Memory KV | Wallet-scoped; default TTL 7d |
| Object store | Public ULID URLs; allowlisted types |
| Fetch / Trust | Shared SSRF denylist |
| Notify | Tickets + email/TG delivery + optional callback |
| Inbox | Inbound email only → poll API |
| Owner ops | Bind channels, OTP, caps, delete |

### Deployment sketch (pre-ADR)

```
agentkeep.app          → static docs / llms / skill / human notify pages
api.agentkeep.app      → TS API (Fly or Render Starter)
artifacts.agentkeep.app→ R2/S3 + CDN
inbox.agentkeep.app    → MX → inbound worker → DB
```

---

## 3. User flows

### 3a. Agent happy path (research → keep → escalate)

```mermaid
sequenceDiagram
  participant A as Agent
  participant K as AgentKeep API
  participant C as CDP / Base USDC
  participant H as Human owner

  A->>K: POST /v1/fetch (no pay)
  K-->>A: 402 x402 challenge
  A->>C: Pay USDC on Base
  A->>K: Retry + payment proof
  K->>K: Verify, cap check, ledger settled
  K-->>A: 200 markdown + receipt + Set session

  A->>K: PUT /v1/memory/... + payment
  K-->>A: 200 stored

  A->>K: GET /v1/budget (session)
  K-->>A: 200 spent/remaining (free)

  A->>K: POST /v1/notify (payment)
  K->>H: Email and/or Telegram
  H->>K: Approve via link / button
  A->>K: GET /v1/notify/{id}
  K-->>A: status approved
```

### 3b. Owner bind + kill switch

```mermaid
sequenceDiagram
  participant A as Agent wallet
  participant K as API
  participant H as Human

  Note over A,K: First settled pay → wallet becomes owner
  A->>K: POST /v1/owner/bind/email
  K->>H: Magic link
  H->>K: Confirm
  K-->>A: email bound

  A->>K: PUT /v1/owner/caps daily=$2→$10
  K->>H: OTP
  H->>K: OTP ok
  K-->>A: caps updated

  Note over H,K: Emergency
  H->>K: OTP + caps daily=0
  K-->>A: Further paid work → budget_exceeded
```

### 3c. Payment failure → credit offset

```mermaid
flowchart LR
  P[Pay settles] --> W[Work runs]
  W -->|success| S[receipt settled]
  W -->|infra fail| C[receipt credited]
  C --> O[credit_minor += amount]
  O --> N[Next paid call]
  N --> A[Apply credit before new 402]
```

### 3d. Public artifact

```mermaid
flowchart LR
  A[Agent POST /artifacts\nmax_bytes declared] --> Pay[x402 prepaid size]
  Pay --> Store[R2 put]
  Store --> URL[artifacts.agentkeep.app/ulid]
  URL --> Anyone[Anyone GET bytes\nno payment]
```

---

## 4. Request pipeline (every tenant call)

```mermaid
flowchart TD
  R[Request] --> RL{Rate limit OK?}
  RL -->|no| R429[429 rate_limited]
  RL -->|yes| Auth{Session or payment proof?}
  Auth -->|neither on free route| A401[401/402 need identity]
  Auth -->|paid route unpaid| P402[402 challenge]
  Auth -->|proof| V[CDP verify]
  V -->|bad| Bad[payment_invalid / replay]
  V -->|ok| Cap{Hard cap OK?}
  Cap -->|no| BE[403 budget_exceeded]
  Cap -->|yes| Work[Execute]
  Work -->|fail after settle| Cred[ledger credited]
  Work -->|ok| Led[ledger settled]
  Led --> Sess[Refresh session]
  Sess --> OK[200 JSON + receipt?]
```

---

## 5. What “solid” means before public mainnet

1. Acceptance suite in `18` green (including owner bind, session free-GET, SSRF, credits)  
2. Default $2 cap + kill switch verified  
3. Canary wallet 48–72h  
4. Discovery files match live OpenAPI prices  
5. Pause switch tested (`payment_unavailable`)  

---

## 6. Related docs

- Decisions: [`21-prebuild-decisions.md`](21-prebuild-decisions.md)  
- Boxes detail: [`16-architecture-overview.md`](16-architecture-overview.md)  
- Payments: [`10-payments-x402-mpp.md`](10-payments-x402-mpp.md)  
- Threats: [`11-security-threat-model.md`](11-security-threat-model.md)  
