# Local run & production deploy

## Prerequisites

- Node 22+
- pnpm 9+ (`corepack enable`)

## Quick start (mock payments — no wallet)

```bash
cp .env.example .env
# SESSION_HMAC_SECRET + PAYMENT_ADAPTER=mock already fine for local

pnpm install
pnpm --filter @agentkeep/api dev
# → http://localhost:8787/healthz
```

### Mock paid call

```bash
curl -s -X PUT http://localhost:8787/v1/memory/demo \
  -H 'content-type: application/json' \
  -H 'x-agentkeep-mock-pay: MY_ALGO_ADDRESS' \
  -d '{"value":{"ok":true}}'
```

Unpaid calls return **402** with `extra.tag=x402-global-challenge`.

## Tests

```bash
pnpm test          # unit + integration
pnpm test:e2e      # end-to-end agent loop (mock adapter)
pnpm typecheck
```

## Live Algorand / GoPlausible (next)

1. Follow [x402 on Algorand](https://dev.algorand.co/resources/x402-on-algorand/) for Testnet accounts + USDC ASA `10458941`.
2. Set `PAYTO_ADDRESS`, `FACILITATOR_URL=https://facilitator.goplausible.xyz`, `PAYMENT_MODE=testnet`.
3. Set `PAYMENT_ADAPTER=live` once the live `@x402/hono` wiring PR lands (interface ready; mock is default for CI).
4. Use Foundation client with `AVM_MNEMONIC` against your public HTTPS URL.

## Deploy (Cloud Run)

See `docs/40c-easy-free-host-cloudrun.md`.

```bash
gcloud run deploy agentkeep-api --source . --region us-central1 \
  --allow-unauthenticated --memory 512Mi --cpu 1 --min-instances 0 --max-instances 2
```

Set secrets: `SESSION_HMAC_SECRET`, `PAYTO_ADDRESS`, `PAYMENT_*`, `PUBLIC_API_BASE`.

## Docker

```bash
docker compose up --build
```
