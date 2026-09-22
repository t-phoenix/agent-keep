# 09 — Pricing & unit economics

Canonical amounts: [`21-prebuild-decisions.md`](21-prebuild-decisions.md) §D.

## Philosophy

1. Habit price — agents call without deliberating  
2. COGS-aware — but **simple wire prices** for v1 x402  
3. Transparent — OpenAPI + llms.txt  
4. Flatten variable surcharges that break 402 challenges  

## Price list (v1 locked intent)

| Endpoint | Price (USDC) | Notes |
|----------|--------------|-------|
| PUT /memory | $0.001 | |
| GET /memory | $0 | Session/proof required |
| DELETE /memory | $0.0005 | |
| LIST /memory | $0.001 / page | |
| POST /artifacts | $0.005 + $0.002×ceil(MiB) | Prepaid via declared `max_bytes` |
| GET artifact URL | $0 | Public |
| POST /notify | $0.02 | |
| GET /notify/{id} | $0.0002 | |
| GET /inbox | $0.002 / page | |
| POST /inbox/ack | $0.0005 | |
| GET /budget | $0 | Session/proof |
| GET /budget/receipts | $0.002 / page | |
| POST /fetch | **$0.01 flat** | |
| GET /trust | $0.002 | |
| Owner bind email/TG | $0.01 each | |
| Owner caps | $0.001 | |
| Owner delete | $0.01 | |

## Free vs paid

| Free | Guard |
|------|-------|
| Memory GET, Budget GET | Session / proof + rate limits |
| Artifact download, discovery, health | Public / free |

## COGS checklist (fill before scanner push)

| Cost center | Est. |
|-------------|------|
| CDP / rail fees | ____ |
| Object storage + egress | ____ |
| KV/DB | ____ |
| Email / Telegram | ____ |
| Fetch egress | ____ |
| Compute | ____ |

**Margin target:** ≥ 50% gross blended after rails.

## Price change policy

1. Update OpenAPI + llms + skill same commit  
2. Never silently raise  
3. Optional grace on old challenge amounts for N hours  
