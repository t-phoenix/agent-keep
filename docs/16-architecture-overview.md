# 16 — Architecture overview

Product locks: [`21-prebuild-decisions.md`](21-prebuild-decisions.md).  
Flows: [`22-flows-and-build-plan.md`](22-flows-and-build-plan.md).  
Cheap infra: [`25-cheap-infra-guide.md`](25-cheap-infra-guide.md).

This is a **box diagram**, not a full stack ADR. Host/DB/blob ADRs in P2 using `25`.

## Logical components

```
                    ┌─────────────────────────┐
                    │  Discovery surfaces      │
                    │  OpenAPI / llms / skill  │
                    │  x402scan listing        │
                    └───────────┬─────────────┘
                                │
┌──────────────┐     ┌──────────▼──────────┐     ┌─────────────────┐
│ Agent wallet │────▶│  API Gateway / Edge │────▶│ Payment verify  │
│ + CDP / x402 │     │  /v1/*              │     │ x402 + CDP      │
└──────────────┘     └──────────┬──────────┘     └────────┬────────┘
                                │                           │
                     ┌──────────▼──────────┐                │
                     │  Budget gate        │◀───────────────┘
                     │  + session mint     │
                     └──────────┬──────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   ┌────────────┐       ┌────────────┐        ┌────────────┐
   │ Memory KV  │       │ Object     │        │ Notify +   │
   │            │       │ store/CDN  │        │ Owner ops  │
   └────────────┘       └────────────┘        └─────┬──────┘
          │                     │                    │
          ▼                     ▼              ┌─────▼──────┐
   ┌────────────┐       ┌────────────┐        │ Email / TG │
   │ Ledger DB  │       │ Fetch+Trust│        │ + inbox MX │
   └────────────┘       │ SSRF guard │        └────────────┘
                        └────────────┘
```

## Hostnames (locked intent)

| Host | Role |
|------|------|
| `agentkeep.app` | Docs, llms.txt, skill, human notify pages |
| `api.agentkeep.app` | Paid API |
| `artifacts.agentkeep.app` | Public artifact bytes |
| `inbox.agentkeep.app` | Inbound email MX |

## Stack direction (partial)

| Layer | Direction |
|-------|-----------|
| Language | **TypeScript** |
| Payments | **x402 + Coinbase CDP**, USDC on Base, mainnet |
| Host | Railway **or** Fly **or** Render Starter — [`25-cheap-infra-guide.md`](25-cheap-infra-guide.md); ADR P2 |
| Postgres | **Neon** (default) |
| Blob | **Cloudflare R2** (no egress) |
| Email | **Resend** |
| Marketing/docs | Cloudflare Pages (free) |
| Notify | Email + Telegram Bot API |

Manual vendor connections: `25` §5. Domains only at P12.

## Observability minimum

- Structured logs: `request_id`, hashed `wallet_id`, `route`  
- Metrics: latency, 402 rate, settle rate, credit rate, error codes  
- Tracing on fetch/trust outbound  
- Ops pause → `payment_unavailable`  
