# 43 — Infra setup: Neon (done) + GCP Cloud Run + rest

**Neon project:** `tiny-meadow-45780043` · branch `production` · linked via `.neon`  
**Local:** `DATABASE_URL` / `DATABASE_URL_UNPOOLED` / `NEON_BRANCH` pulled into `.env` (gitignored)

---

## A. Neon — already completed in this repo

| Step | Command / result |
|------|------------------|
| CLI | `npm i -g neon@latest` |
| Login | `neon login` / `neon auth` → browser OK |
| Skills | `neon skills -y` → Cursor skills installed |
| MCP | `neon mcp -y` → Cursor MCP + API key minted |
| Link | `neon link --project-id tiny-meadow-45780043 --branch production -y` |
| Config | `neon config init` + `neon.ts` = `defineConfig({})` |
| Deploy | `neon deploy --update-existing --allow-protected` → no-op (already matches) |

**Do not commit:** `.env`, `.neon` (already in `.gitignore`).  
**Do commit:** `neon.ts`, `@neon/config` / `@neon/env` in root `package.json`.

**Rotate note:** Connection strings live only in local `.env`. If this chat or a screen share exposed them, rotate the role password in Neon Console → project → Roles.

### Useful Neon Console clicks

1. Open [console.neon.tech](https://console.neon.tech)  
2. Project **Agent Keep** / id `tiny-meadow-45780043`  
3. **Branches** → `production`  
4. **Connection details** → copy **pooled** URL for Cloud Run `DATABASE_URL`  
5. **Settings → Reset password** if you need a new secret  

Re-pull locally anytime:

```bash
neon env pull
# or
neon link --project-id tiny-meadow-45780043 --branch production -y
```

---

## B. Google Cloud Run — detailed navigation (do this next)

### B0. Before you start

- Billing account / card (Always Free still needs a billing account; set a **$1 budget alert**)  
- Prefer region **`us-central1`** (Free Tier–eligible)  
- Repo: `https://github.com/t-phoenix/agent-keep` (already pushed)

### B1. Create / select project

1. Open [Google Cloud Console](https://console.cloud.google.com/)  
2. Top bar project picker → **New Project**  
   - Name: `agentkeep`  
   - Organization: your personal org / No organization  
3. **Create** → wait → select project `agentkeep`  

### B2. Link billing + budget alert (critical)

1. Menu ☰ → **Billing** → **Link a billing account** (or create one)  
2. ☰ → **Billing** → select account → **Budgets & alerts** → **Create budget**  
   - Name: `agentkeep-cap`  
   - Projects: `agentkeep`  
   - Amount: **$1** (or $5)  
   - Thresholds: 50%, 90%, 100% → email you  
3. Optional: ☰ → **IAM & Admin** → **Quotas** — later you can restrict Cloud Run if needed  

### B3. Enable APIs

1. ☰ → **APIs & Services** → **Library**  
2. Search and **Enable** each:  
   - **Cloud Run API**  
   - **Cloud Build API**  
   - **Artifact Registry API**  
   - **Secret Manager API** (recommended for `DATABASE_URL`, `SESSION_HMAC_SECRET`)  

Or Cloud Shell:

```bash
gcloud config set project agentkeep
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

### B4. Install `gcloud` locally (optional but useful)

1. [Install Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (or `brew install --cask google-cloud-sdk`)  
2. `gcloud auth login`  
3. `gcloud auth application-default login`  
4. `gcloud config set project agentkeep`  
5. `gcloud config set run/region us-central1`  

### B5. Store secrets in Secret Manager

1. ☰ → **Security** → **Secret Manager** → **Create secret**  
2. Create these secrets (values from local `.env` / Neon / openssl):  

| Secret name | Value source |
|-------------|--------------|
| `DATABASE_URL` | Neon **pooled** connection string |
| `SESSION_HMAC_SECRET` | `openssl rand -hex 32` |
| `PAYTO_ADDRESS` | Mainnet (or Testnet for staging) Algorand address |
| `FACILITATOR_URL` | `https://facilitator.goplausible.xyz` |

3. For each: **Create secret** → paste value → **Create**  

### B6. Deploy from source (first time)

**Option A — Console (point-and-click)**

1. ☰ → **Cloud Run** → **Bring your code** / **Deploy container** → **Continuously deploy from a repository** (or **Deploy one revision from source**)  
2. If from GitHub:  
   - Connect GitHub → authorize Google Cloud Build  
   - Repo: `t-phoenix/agent-keep`  
   - Branch: `main`  
3. Service name: `agentkeep-api`  
4. Region: **`us-central1`**  
5. Authentication: **Allow unauthenticated invocations** (public x402 API)  
6. Container:  
   - Build type: Dockerfile (repo root `Dockerfile`)  
   - Port: **8080**  
7. Resources: CPU **1**, Memory **512 MiB**  
8. Autoscaling: **Min instances = 0**, **Max instances = 2**  
9. **Container, Variables & Secrets, Connections, Security** tab:  
   - Variables:  

| Name | Value |
|------|--------|
| `NODE_ENV` | `production` |
| `PAYMENT_FACILITATOR` | `goplausible` |
| `PAYMENT_MODE` | `testnet` first (flip `mainnet` later) |
| `PAYMENT_ADAPTER` | `mock` until live x402 lands; then `live` |
| `USDC_ASA_ID` | `10458941` (testnet) / `31566704` (mainnet) |
| `X402_CHALLENGE_TAG` | `x402-global-challenge` |
| `DEFAULT_DAILY_CAP_MINOR` | `2000000` |
| `PAYMENT_PAUSE` | `false` |

   - Secrets → Reference as env vars:  

| Env var | Secret |
|---------|--------|
| `DATABASE_URL` | `DATABASE_URL` latest |
| `SESSION_HMAC_SECRET` | `SESSION_HMAC_SECRET` latest |
| `PAYTO_ADDRESS` | `PAYTO_ADDRESS` latest |
| `FACILITATOR_URL` | `FACILITATOR_URL` latest |

10. **Create** / **Deploy** → wait for green  
11. Copy the URL `https://agentkeep-api-…..run.app`  

12. Edit service → add variables:  

| Name | Value |
|------|--------|
| `PUBLIC_API_BASE` | that `https://….run.app` URL |
| `OWNER_WEB_BASE` | same for now |

13. **Deploy** again  

**Option B — CLI**

```bash
cd ~/Desktop/AgentKeep
gcloud run deploy agentkeep-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --timeout 60 \
  --set-env-vars "NODE_ENV=production,PAYMENT_FACILITATOR=goplausible,PAYMENT_MODE=testnet,PAYMENT_ADAPTER=mock,USDC_ASA_ID=10458941,X402_CHALLENGE_TAG=x402-global-challenge,DEFAULT_DAILY_CAP_MINOR=2000000,PAYMENT_PAUSE=false" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,SESSION_HMAC_SECRET=SESSION_HMAC_SECRET:latest,PAYTO_ADDRESS=PAYTO_ADDRESS:latest,FACILITATOR_URL=FACILITATOR_URL:latest"
```

Then set `PUBLIC_API_BASE` to the printed URL and redeploy.

### B7. Verify

```bash
curl -s https://YOUR-SERVICE-XXXX.us-central1.run.app/healthz
# → {"status":"ok"}
```

Mock paid call (until live x402):

```bash
curl -s -X PUT https://YOUR-SERVICE/v1/memory/demo \
  -H 'content-type: application/json' \
  -H 'x-agentkeep-mock-pay: YOUR_TESTNET_ADDR' \
  -d '{"value":{"ok":true}}'
```

### B8. IAM tip (if deploy fails on secrets)

Cloud Run service account needs **Secret Manager Secret Accessor**:

1. ☰ → **Cloud Run** → service → **Security** → note service account  
2. ☰ → **IAM** → find that SA → **Edit** → add role **Secret Manager Secret Accessor**

### B9. Cost hygiene

- Min instances **0** (do not set 1 on free tier)  
- Budget alert email on  
- Check **Billing → Reports** weekly  
- Optional keep-warm: free uptime ping every 5–10 min to `/healthz`

---

## C. Rest of infra (after Cloud Run)

### C1. Cloudflare R2 (artifacts — P1)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** → **Create bucket** `agentkeep-artifacts`  
2. **Manage R2 API Tokens** → Create (Object Read & Write)  
3. Copy Account ID, Access Key ID, Secret  
4. Add to Cloud Run secrets / env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`  
5. Set `ARTIFACTS_BASE` to public R2 URL (or continue serving `/a/:id` until R2 wired in code)

### C2. Resend (email — P1)

1. [resend.com](https://resend.com) → API Keys → Create  
2. Cloud Run env: `EMAIL_API_KEY`, `EMAIL_FROM=onboarding@resend.dev`  
3. Custom domain later (SPF/DKIM)

### C3. Algorand wallets (challenge)

| Wallet | Network | Action |
|--------|---------|--------|
| payTo | Testnet then Mainnet | Opt-in USDC; set `PAYTO_ADDRESS` |
| canary payer | same | Fund ALGO + USDC for canaries |

ASA: Testnet `10458941` · Mainnet `31566704`  
Facilitator: GoPlausible (already in env)

### C4. Optional Cloudflare Pages

Static owner confirm pages / `llms.txt` — same CF account as R2.

---

## D. Env checklist for Cloud Run (copy)

```
NODE_ENV=production
PAYMENT_FACILITATOR=goplausible
PAYMENT_MODE=testnet          # → mainnet for challenge scoring
USDC_ASA_ID=10458941          # → 31566704
PAYTO_ADDRESS=<secret>
FACILITATOR_URL=https://facilitator.goplausible.xyz
PAYMENT_ADAPTER=mock          # → live after P0.1
PAYMENT_PAUSE=false
X402_CHALLENGE_TAG=x402-global-challenge
SESSION_HMAC_SECRET=<secret>
DEFAULT_DAILY_CAP_MINOR=2000000
DATABASE_URL=<neon pooled secret>
PUBLIC_API_BASE=https://….run.app
OWNER_WEB_BASE=https://….run.app
```

---

## E. Order of operations from here

1. ✅ Neon linked + `neon.ts` deployed  
2. ⬜ GCP project + billing + $1 budget  
3. ⬜ Secret Manager + Cloud Run deploy  
4. ⬜ `curl /healthz` on public URL  
5. ⬜ Wire live x402 in code → `PAYMENT_ADAPTER=live`  
6. ⬜ Testnet settle → Mainnet settle → submit  

Related: `40c` · `42` · `41` · `33`
