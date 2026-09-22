# Architecture Decision Records

ADRs record **why** we chose a stack/protocol option.  
Product law: `docs/21-prebuild-decisions.md`. Cheap vendor defaults: `docs/25-cheap-infra-guide.md`.

## Process

1. Copy `../templates/ADR-template.md` → `NNNN-title.md`  
2. Status: Proposed → Accepted / Rejected / Superseded  
3. Link from `../16-architecture-overview.md` when accepted  
4. Human must approve infra ADRs (see `24` P2 / `25` §9)

## First ADRs (P2)

| ID | Topic | Default lean (`25`) |
|----|-------|---------------------|
| 0001 | API host (Railway vs Fly vs Render) | Railway **or** Fly; Render OK if familiar |
| 0002 | Postgres | **Neon** |
| 0003 | Object storage | **Cloudflare R2** |
| 0004 | Email provider | **Resend** |
| 0005 | Redis (optional) | none → Upstash if needed |
| 0006 | Runtime (TS framework) | Hono or Fastify |

Already product-locked (no ADR needed unless changing): x402 + CDP + Base USDC; public artifacts; domains at P12.

Do **not** choose x402 rent-a-VM / third-party x402 object stores as primary infra (`25` §2.2).
