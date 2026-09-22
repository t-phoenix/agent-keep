# AgentKeep

**Wallet-scoped OS primitives for AI agents.**  
No signup. Pay a few cents. Get JSON. Keep going.

| Primitive | Job |
|-----------|-----|
| `/memory` | Wallet-scoped KV |
| `/artifacts` | Upload → durable URL + hash |
| `/notify` | Human approve / deny / answer |
| `/inbox` | Inbound messages |
| `/budget` | Caps + receipts |
| `/fetch` | URL → text (SSRF-safe) |
| `/trust` | Probe URL / x402 signals |

**Track:** [Algorand Global x402 Challenge](https://algorand.co/global-x402-challenge) — Composite · GoPlausible · tag `x402-global-challenge`  
**Status:** API scaffold running with **mock payments** + full route surface; live `@x402/hono` adapter next.

### Quick start

```bash
cp .env.example .env
pnpm install
pnpm --filter @agentkeep/api dev
pnpm test && pnpm test:e2e
```

Mock pay header: `x-agentkeep-mock-pay: <algorand-address>`

Docs: [`docs/41-dev-and-deploy.md`](docs/41-dev-and-deploy.md) · [`docs/27`](docs/27-algorand-x402-challenge.md) · [`docs/40c`](docs/40c-easy-free-host-cloudrun.md) · [`AGENTS.md`](AGENTS.md)
