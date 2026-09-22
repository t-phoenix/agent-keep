# 42 — Implementation audit & forward plan

**Date:** 2026-09-23  
**Repo:** `git@github.com:t-phoenix/agent-keep.git`  
**Host:** Cloud Run (Always Free) + Neon Free + R2 — `40c`

---

## 1. Audit summary

### Working (mock pay)

| Area | Status |
|------|--------|
| Hono API, healthz | ✅ |
| Memory CRUD + session GET | ✅ |
| Fetch + SSRF + post-pay credit | ✅ |
| Trust, budget, receipts | ✅ |
| Hard cap + credit + wallet lock | ✅ |
| Artifacts / notify / inbox / owner | ⚠️ API present; stubs (no R2 / email / TG) |
| Mock x402 + challenge tag | ✅ |
| Tenancy `algo:` | ✅ |
| Dockerfile | ✅ |
| Live GoPlausible `@x402/hono` | ❌ |
| Neon persistence | ❌ (in-memory only) |
| R2 artifacts | ❌ |
| Bazaar discovery | ❌ |
| Public HTTPS / Mainnet settle | ❌ |

**Verdict:** Good local Composite demo with mock payments. **Not** challenge-ready until live x402 + HTTPS + Mainnet settle. **Not** production-ready until Neon + real notify + R2.

---

## 2. Dev backlog

### P0 — challenge eligibility

1. Wire **live** `@x402/hono` + GoPlausible (`PAYMENT_ADAPTER=live`)  
2. Bazaar extension + tag on paid routes  
3. **Neon** store (wallets, memory, ledger, nonces)  
4. Deploy **Cloud Run** HTTPS from GitHub  
5. Mainnet payTo settle ≥1 + leaderboard/Bazaar proof  
6. Submit form + Electric Capital  

### P1 — production

R2 artifacts · Resend email/OTP · `/openapi.json` · Telegram · rate limits · logging  

### P2 — polish

Split `app.ts` · inbox email webhook · custom domain  

---

## 3. Infra needed

| Piece | Vendor | ~Cost |
|-------|--------|-------|
| API | Google Cloud Run | $0 Always Free |
| DB | Neon Free | $0 |
| Blobs | Cloudflare R2 | $0 free tier |
| Email | Resend Free | $0 (P1) |
| Git | GitHub `t-phoenix/agent-keep` | $0 |
| Wallets | Pera Testnet + Mainnet | USDC/ALGO only |

---

## 4. Production env vars

**Never commit `.env`.** Set in Cloud Run secrets.

### Required (Mainnet challenge)

| Var | Value / how to get |
|-----|-------------------|
| `NODE_ENV` | `production` |
| `PAYMENT_MODE` | `mainnet` |
| `USDC_ASA_ID` | `31566704` |
| `PAYTO_ADDRESS` | Mainnet receive addr (Pera; never rotate) |
| `FACILITATOR_URL` | `https://facilitator.goplausible.xyz` |
| `PAYMENT_ADAPTER` | `live` (after P0.1) |
| `PAYMENT_FACILITATOR` | `goplausible` |
| `X402_CHALLENGE_TAG` | `x402-global-challenge` |
| `SESSION_HMAC_SECRET` | `openssl rand -hex 32` |
| `DEFAULT_DAILY_CAP_MINOR` | `2000000` |
| `PUBLIC_API_BASE` | Cloud Run URL after deploy |
| `OWNER_WEB_BASE` | same or Pages URL |
| `DATABASE_URL` | Neon → pooled connection string |

### Staging

Same with `PAYMENT_MODE=testnet`, ASA `10458941`, Testnet payTo.

### Optional P1

`R2_*`, `ARTIFACTS_BASE`, `EMAIL_API_KEY`, `EMAIL_FROM`, `TELEGRAM_BOT_TOKEN`

### How to get credentials

- **Neon:** neon.tech → project → Connection string (pooled) → `DATABASE_URL`  
- **Cloud Run:** console.cloud.google.com → project → enable billing + **$1 budget alert** → deploy → copy `*.run.app` → `PUBLIC_API_BASE`  
- **payTo:** Pera Mainnet → opt-in USDC `31566704` → copy address  
- **R2:** Cloudflare → R2 → bucket + API token  
- **Resend:** resend.com → API key  

Local only: `PAYMENT_ADAPTER=mock` (already in `.env.example`).

---

## 5. Repo clean + git init

`.gitignore` must exclude: `node_modules/`, `dist/`, `.env`, coverage, IDE, keys.  
Commit `.env.example` only — **never** `.env` (yours has a real `PAYTO_ADDRESS`).

```bash
cd ~/Desktop/AgentKeep
git init
git add -A
git status   # .env must NOT appear
git commit -m "feat: AgentKeep API scaffold, mock x402, challenge docs"
git branch -M main
git remote add origin git@github.com:t-phoenix/agent-keep.git
# if remote has empty README commit:
git pull origin main --rebase --allow-unrelated-histories || true
git push -u origin main
```

---

## 6. Next session order

1. Free disk if `ENOSPC` · `pnpm install && pnpm test`  
2. Push GitHub  
3. Live x402 · Neon · Cloud Run · Mainnet canary · submit  

Related: `41` · `40c` · `33` · `27` · `28`
