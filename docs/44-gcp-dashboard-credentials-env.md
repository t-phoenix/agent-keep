# 44 — GCP Console: credentials, Cloud Run, local `.env`

Use this after the **4 APIs** are enabled (Cloud Run, Cloud Build, Artifact Registry, Secret Manager).  
Console: [console.cloud.google.com](https://console.cloud.google.com/) — confirm the correct **project** is selected in the top bar.

**Local `.env` is gitignored.** Never paste secrets into chat or commit them.

---

## 0. Confirm project + APIs

1. Top bar → project picker → select **`agentkeep`** (or whatever you named it).  
2. ☰ → **APIs & Services** → **Enabled APIs & services**.  
3. Confirm you see: Cloud Run, Cloud Build, Artifact Registry, Secret Manager.  
4. ☰ → **Billing** → ensure a billing account is linked + a **$1 budget alert** exists (`43` §B2).

---

## 1. Credentials you actually need

For AgentKeep you usually do **not** need a downloadable service-account JSON for local API work. Prefer:

| Goal | What to use |
|------|-------------|
| Local app secrets | Values in **`.env`** (Neon already pulled `DATABASE_URL`) |
| Deploy / `gcloud` on your laptop | **Application Default Credentials** via browser login |
| Cloud Run at runtime | **Secret Manager** secrets mounted as env vars |

### 1.A Laptop login (recommended)

In Terminal (not required for pure Console deploys):

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default login
```

Find **Project ID** (not just display name):  
☰ → **IAM & Admin** → **Settings** → copy **Project ID**.

### 1.B Optional: create a service account (only if a tool asks for a key)

Most Cloud Run deploys from Console/GitHub **do not** need this.

1. ☰ → **IAM & Admin** → **Service Accounts** → **+ Create service account**  
2. Name: `agentkeep-deploy` → **Create and continue**  
3. Roles (minimal deploy set):  
   - Cloud Run Admin  
   - Service Account User  
   - Secret Manager Secret Accessor  
   - Cloud Build Editor (if building)  
4. **Done**  
5. Open the SA → **Keys** → **Add key** → **Create new key** → **JSON** → download once → store offline.  
6. **Do not** put the JSON in the repo. If you must use it locally:  
   `export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/key.json"`

Prefer ADC (`gcloud auth application-default login`) over long-lived JSON keys.

---

## 2. Create secrets in Secret Manager (dashboard)

These become the source of truth for Cloud Run; you can also copy values into local `.env`.

1. ☰ → **Security** → **Secret Manager**  
   (If missing: search top bar for “Secret Manager”.)  
2. For each row below: **+ Create secret**  

| Secret name | What to put | Where to get the value |
|-------------|-------------|------------------------|
| `DATABASE_URL` | Neon **pooled** Postgres URL | Neon Console → project → Connection details → **Pooled**, or local `.env` after `neon env pull` |
| `SESSION_HMAC_SECRET` | Long random hex | Terminal: `openssl rand -hex 32` |
| `PAYTO_ADDRESS` | Algorand address (Testnet for staging) | Pera Wallet |
| `FACILITATOR_URL` | `https://facilitator.goplausible.xyz` | Literal |

3. **Name** = exact secret name above.  
4. **Secret value** = paste → **Create secret**.  
5. Later updates: open secret → **+ New version** → paste → **Add**.

### Grant Cloud Run access to secrets

1. ☰ → **Cloud Run** → (after service exists) open service → **Security** tab → note **Service account** email.  
2. Or default: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`  
   Project number: ☰ → **IAM & Admin** → **Settings**.  
3. ☰ → **IAM & Admin** → **IAM** → find that SA → pencil → add role **Secret Manager Secret Accessor** → Save.  

Or per-secret: Secret Manager → secret → **Permissions** → **Grant access** → that SA → role **Secret Manager Secret Accessor**.

---

## 3. Create / configure Cloud Run (dashboard)

### 3.A First deploy from GitHub (easiest ongoing)

1. ☰ → **Cloud Run** → **Create service** (or **Deploy from source repository**).  
2. Choose **Continuously deploy from a repository** (Cloud Build).  
3. **Authenticate** with GitHub if asked → select **`t-phoenix/agent-keep`**.  
4. Branch: **`main`**.  
5. Build type: **Dockerfile** (repo root).  
6. Service name: `agentkeep-api`.  
7. Region: **`us-central1`**.  
8. Authentication: **Allow unauthenticated invocations**.  
9. Container port: **8080**.  
10. CPU: **1**, Memory: **512 MiB**.  
11. Autoscaling: **Minimum instances = 0**, **Maximum = 2**.  
12. Open **Container, Variables & Secrets, Connections, Security**.

#### Variables (non-secret)

Click **Variables & secrets** → **References** / **Add variable**:

| Name | Value (staging first) |
|------|------------------------|
| `NODE_ENV` | `production` |
| `PAYMENT_FACILITATOR` | `goplausible` |
| `PAYMENT_MODE` | `testnet` |
| `PAYMENT_ADAPTER` | `mock` (until live x402) |
| `USDC_ASA_ID` | `10458941` |
| `X402_CHALLENGE_TAG` | `x402-global-challenge` |
| `DEFAULT_DAILY_CAP_MINOR` | `2000000` |
| `PAYMENT_PAUSE` | `false` |
| `PAYMENT_NETWORK` | `ALGORAND_Testnet_CAIP2` |

#### Secrets → env vars

**Reference a secret** (not plain text):

| Env var name | Secret | Version |
|--------------|--------|---------|
| `DATABASE_URL` | `DATABASE_URL` | `latest` |
| `SESSION_HMAC_SECRET` | `SESSION_HMAC_SECRET` | `latest` |
| `PAYTO_ADDRESS` | `PAYTO_ADDRESS` | `latest` |
| `FACILITATOR_URL` | `FACILITATOR_URL` | `latest` |

13. **Create** / **Deploy** → wait until status **Ready**.  
14. Copy the URL at the top: `https://agentkeep-api-xxxxx-uc.a.run.app`.  
15. **Edit & deploy new revision** → add variables:  

| Name | Value |
|------|--------|
| `PUBLIC_API_BASE` | the `https://….run.app` URL you copied |
| `OWNER_WEB_BASE` | same URL for now |

16. Deploy again.

### 3.B Verify in Console

1. Cloud Run → `agentkeep-api` → **Metrics** / **Logs**.  
2. Open URL + `/healthz` in browser → `{"status":"ok"}`.  
3. **Revisions** tab → confirm latest is serving 100%.

---

## 4. Where to *find* env values in GCP (and copy to local)

GCP does not auto-sync Cloud Run env into your laptop. You **copy** them into `.env`.

### 4.A From Cloud Run UI

1. Cloud Run → `agentkeep-api` → **Edit & deploy new revision** (or **YAML** / **Revisions** → latest).  
2. **Variables & secrets** section:  
   - Plain variables: visible → copy into local `.env`.  
   - Secrets: only show **secret name**, not the value.  

### 4.B Read a secret’s value (dashboard)

1. ☰ → **Secret Manager** → click secret (e.g. `SESSION_HMAC_SECRET`).  
2. **Versions** → open latest → **Actions** → **View secret value** → copy.  
3. Paste into local `.env` as `SESSION_HMAC_SECRET=...` (no quotes needed unless spaces).

### 4.C Neon values (not GCP)

Already local after link. Refresh anytime:

```bash
cd ~/Desktop/AgentKeep
neon env pull
# merges DATABASE_URL, DATABASE_URL_UNPOOLED, NEON_BRANCH into .env
```

Or Neon Console → Connection details → copy pooled URL into `.env` as `DATABASE_URL=...`.

### 4.D What your local `.env` should look like after GCP exists

Keep using `.env.example` as the template. Fill real values in **`.env` only**:

```bash
# already from Neon
DATABASE_URL=...
DATABASE_URL_UNPOOLED=...
NEON_BRANCH=production

# generate once; same value as Secret Manager
SESSION_HMAC_SECRET=...   # openssl rand -hex 32

# Algorand
PAYTO_ADDRESS=...
FACILITATOR_URL=https://facilitator.goplausible.xyz
PAYMENT_MODE=testnet
PAYMENT_ADAPTER=mock
USDC_ASA_ID=10458941

# after Cloud Run is live — use the public URL
PUBLIC_API_BASE=https://agentkeep-api-xxxxx-uc.a.run.app
OWNER_WEB_BASE=https://agentkeep-api-xxxxx-uc.a.run.app

PORT=8787
NODE_ENV=development
```

Local still runs on `PORT=8787`. `PUBLIC_API_BASE` points at Cloud Run when you test against the deployed service; for pure local:

```bash
PUBLIC_API_BASE=http://localhost:8787
OWNER_WEB_BASE=http://localhost:8787
```

### 4.E Optional: pull Cloud Run env with CLI

```bash
gcloud run services describe agentkeep-api --region us-central1 --format=yaml
```

Shows env var **names** and secret refs. Secret **values** still come from Secret Manager:

```bash
gcloud secrets versions access latest --secret=SESSION_HMAC_SECRET
gcloud secrets versions access latest --secret=DATABASE_URL
```

Paste those into `.env` yourself (do not commit).

---

## 5. Checklist (order)

- [ ] Correct GCP project selected  
- [ ] Billing + $1 budget alert  
- [ ] Secret Manager: 4 secrets created  
- [ ] Cloud Run service deployed, unauthenticated, min instances 0  
- [ ] Variables + secret refs set  
- [ ] `PUBLIC_API_BASE` set to service URL  
- [ ] `/healthz` works on public URL  
- [ ] Local `.env` has Neon URLs + same secrets (for local `pnpm dev`)  
- [ ] `.env` not committed (`git status` clean of `.env`)

---

## 6. Common dashboard blockers

| Symptom | Fix |
|---------|-----|
| “API not enabled” | APIs & Services → Enable the missing one |
| Deploy can’t read secret | Grant SA **Secret Manager Secret Accessor** |
| Billing required | Link billing account |
| Cold start slow | Normal with min instances 0; optional uptime ping |
| Wrong project | Top bar project picker |

Related: `43` · `40c` · `42` · `.env.example`
