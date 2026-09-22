# 07 — Data model

Tenancy rule: **every row is scoped to `wallet_id`** derived from verified payment proof or valid session. Cross-wallet reads are bugs, not features.

Canonical locks: [`21-prebuild-decisions.md`](21-prebuild-decisions.md).

## Core entities

### WalletAccount

| Field | Type | Notes |
|-------|------|-------|
| wallet_id | string (PK) | `base:<address>` |
| created_at | datetime | First settled pay |
| status | enum | `active`, `suspended`, `banned` |
| email | string? | Bound; encrypted |
| telegram_chat_id | string? | Bound; encrypted |
| caps | object | `{ daily_usdc_minor }` — **hard only** |
| credit_minor | int | Spend offset from `credited` receipts; expires tracked separately |
| metadata | object | Non-secret flags |

### Session

| Field | Type | Notes |
|-------|------|-------|
| token_hash | string (PK) | Hash of `X-AgentKeep-Session` |
| wallet_id | string | |
| expires_at | datetime | 15 min from mint/refresh |
| created_at | datetime | |

### MemoryObject

| Field | Type | Notes |
|-------|------|-------|
| wallet_id | string | PK part |
| key | string | PK part; max 256 chars; reject `..`, empty |
| value | bytes | Max **64 KiB** |
| content_type | string | |
| created_at | datetime | |
| updated_at | datetime | |
| expires_at | datetime | Default **now+7d** if client omits TTL; ceiling 30d |

### Artifact

| Field | Type | Notes |
|-------|------|-------|
| artifact_id | ulid | PK |
| wallet_id | string | |
| content_hash | string | sha256 hex |
| storage_key | string | Object store pointer |
| url | string | `https://artifacts.agentkeep.app/{artifact_id}` |
| content_type | string | Allowlisted |
| byte_size | int | |
| created_at | datetime | |
| expires_at | datetime | Default +90d |

### NotifyTicket

| Field | Type | Notes |
|-------|------|-------|
| ticket_id | ulid | PK |
| wallet_id | string | |
| question | text | Max 4000 |
| context | json? | |
| max_wait_seconds | int | |
| status | enum | `pending`, `approved`, `denied`, `answered`, `timeout`, `cancelled` |
| answer_text | text? | |
| channel | enum | `email`, `telegram`, `both` |
| callback_url | string? | |
| resolve_token_hash | string | Unguessable human action token |
| created_at | datetime | |
| resolved_at | datetime? | |

### InboxMessage

| Field | Type | Notes |
|-------|------|-------|
| message_id | ulid | PK |
| wallet_id | string | |
| inbox_address | string | `{hash8}@inbox.agentkeep.app` |
| from_addr | string | |
| subject | string? | |
| body_text | text | Max 100 KiB; attachments stripped |
| received_at | datetime | |
| read_at | datetime? | |

### LedgerEntry (receipt)

| Field | Type | Notes |
|-------|------|-------|
| receipt_id | ulid | PK |
| wallet_id | string | |
| route | string | e.g. `POST /v1/fetch` |
| amount | int | Minor units |
| decimals | int | 6 |
| asset | string | `USDC` |
| network | string | `base` |
| payment_ref | string | x402 / CDP proof id |
| request_id | string | |
| status | enum | `settled`, `credited`, `failed` |
| credit_expires_at | datetime? | If credited: +7d |
| created_at | datetime | |
| meta | json | bytes, cache, etc. |

### CreditLedger (optional materialization)

Track remaining `credit_minor` on WalletAccount; decrement on next paid settle.

~~TaskBudget~~ — **deferred v1.1**

---

## ID & URL conventions

- Public ids: **ULID**  
- Artifact URLs: `https://artifacts.agentkeep.app/{artifact_id}`  
- Inbox: `{first8_hex_of_sha256(wallet_id)}@inbox.agentkeep.app`  
- Human notify pages: `https://agentkeep.app/n/{ticket_id}/{token}`

## Retention

| Store | Retention |
|-------|-----------|
| Memory default TTL | 7 days |
| Memory ceiling | 30 days |
| Artifacts | 90 days |
| Inbox | 30 days |
| Notify tickets | 90 days |
| Ledger | 24 months+ |
| Credits | 7 days |

## Consistency

| Resource | Expectation |
|----------|-------------|
| Memory GET after PUT | Read-after-write same region |
| Ledger | Append-only; `settled`/`credited` immutable |
| Budget | Hard check pre-work; ≤1 concurrent overshoot acceptable then reconcile |

## Data flow

```
Agent request
  → rate limit
  → session or x402 verify
  → hard budget pre-check (+ apply credits)
  → authorize wallet_id
  → execute
  → ledger settled | credited
  → refresh session
  → JSON response
```
