# 08 — API product notes

Companion to OpenAPI. Canonical locks: [`21-prebuild-decisions.md`](21-prebuild-decisions.md).

## Base

- Prefix: `/v1`
- Hosts: `api.agentkeep.app`, `artifacts.agentkeep.app`, `agentkeep.app`
- Auth: x402 payment proof and/or `X-AgentKeep-Session` (never API keys for agent MVP)
- Versioning: breaking → `/v2`

## Identity

| Route class | Auth |
|-------------|------|
| Paid routes | x402 proof required (session alone insufficient to skip pay) |
| Free tenant GETs (memory get, budget get) | Valid session **or** wallet proof |
| Public | health, openapi, artifact CDN GET, human notify pages |
| Owner mutating | Payment + channel OTP where required |

## Idempotency

| Route | Rule |
|-------|------|
| Memory PUT | LWW; Idempotency-Key → bill once |
| Artifact POST | Same key + same sha256 → existing, no double charge |
| Notify POST | Same key → same ticket |
| Fetch POST | Same key ≤5 min may return cached (`cache: true`) |

## Money

Always nested on receipts:

```json
{ "money": { "amount": 10000, "decimals": 6, "asset": "USDC", "network": "base" } }
```

## Endpoint semantics

### Memory
- Default TTL 7d if omitted; max 30d  
- LIST returns keys only  
- GET free with session  

### Artifacts
- Require `max_bytes` (or Content-Length) for prepaid pricing  
- Public URL by `artifact_id`  
- 90d retention then 404  

### Notify
- Owner-bound channels only  
- Poll = source of truth  
- Optional `callback_url` (SSRF rules in `21`)  
- Human: email links / TG buttons  

### Inbox
- Email ingress only  
- Provision on first paid GET  
- No POST create inbox  

### Budget
- Hard daily cap only  
- `credit_minor` + receipts with `status`  
- Caps via owner OTP path  

### Fetch
- Flat $0.01; `max_bytes` truncates  
- Shared SSRF denylist  

### Trust
- HEAD/GET probe; 3s; looks_x402 definition in `21`  

### Owner
- bind email/telegram, caps, delete — see OpenAPI  

## Rate limits

See `21` §J. `429` + `rate_limited` + `Retry-After`.

## SLA targets (product, not legal)

| Metric | Target |
|--------|--------|
| Memory/Budget availability | 99.5% monthly |
| Fetch p95 | < 5s excl. origin slowness |
| Notify deliver p95 | < 30s to provider accept |
