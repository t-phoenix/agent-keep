# 40c — Easy free host (Oracle/Koyeb unavailable)

**Status:** Active fallback when Oracle Always Free and Koyeb are not usable  
**Budget:** Prefer **~$0** until demand requires scale · ceiling **≤ $5/mo**  
**Constraint:** Ongoing free allowances (monthly reset), **not** time-boxed trials

---

## Recommendation (new try-order)

| Priority | Host | Why | Free character | Catch |
|----------|------|-----|----------------|-------|
| **1 — prefer** | **[Google Cloud Run](https://cloud.google.com/run)** | Easiest Docker + HTTPS; fits Node/Hono API + Neon | **Always Free** monthly quotas ([docs](https://docs.cloud.google.com/free/docs/free-cloud-features)) — not a countdown trial | Needs GCP billing account + **budget alert**; scales to zero (cold start); stay in free-tier region |
| **2 — always-on free** | **[Northflank](https://northflank.com/pricing) Sandbox** | 2 always-on services, no sleep | Ongoing Sandbox free | Card required for **identity verify** only; set billing alerts |
| **3 — last resort** | **Fly.io** smallest Machine | Simple always-on | Paid ~**$1.94+/mo** | Not free; OK within ≤$5 |

**Keep unchanged (~$0):** Neon Free · Cloudflare R2 · Pages · Resend.

**Do not use as the plan:** Fly/Railway “trials”, exhausted Render free, Workers Free (10 ms CPU too tight for GoPlausible + Postgres).

---

## Why Cloud Run for AgentKeep

- Public HTTPS URL out of the box (`*.run.app`) — challenge-ready.  
- Deploy from **Dockerfile** (same image you can later move to Fly/K8s).  
- Free tier resets **every month** (requests + CPU + memory seconds) — see [Cloud Run pricing](https://cloud.google.com/run/pricing) / [Free Tier features](https://docs.cloud.google.com/free/docs/free-cloud-features).  
- Scales to zero when idle → stays near **$0** at low volume.  
- Pair with **Neon** (not Cloud SQL) so DB stays on Neon’s permanent free plan.

**Tradeoff:** First request after idle can cold-start (a few seconds). Mitigate with a free uptime ping every 5–10 min **or** accept cold starts for canaries. Do **not** set `min-instances=1` on free tier (that burns Always Free CPU continuously).

---

## Path A — Google Cloud Run (step list)

### A1. Account & safety rails

1. Create / sign in: [Google Cloud Console](https://console.cloud.google.com/).  
2. Create project: `agentkeep`.  
3. Enable billing (card usually required). **This does not mean you will be charged** if you stay in Free Tier.  
4. **Billing → Budgets & alerts** → budget **$1/month** (or $5) → email you at 50/90/100%.  
5. Optional: set a hard spend cap / disable billing if over budget (org policy) so overages can’t surprise you.

### A2. Enable APIs

```bash
gcloud config set project agentkeep
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Or Console → APIs → enable **Cloud Run**, **Cloud Build**, **Artifact Registry**.

### A3. Region (must be Free Tier–eligible)

Use one of: **`us-central1`**, **`us-east1`**, or **`us-west1`**  
(Free Tier Cloud Run usage is applied in these regions — confirm on current Google Free Tier docs.)

### A4. Deploy (once Dockerfile exists in repo)

From repo root (after H1 has a working `Dockerfile`):

```bash
gcloud run deploy agentkeep-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --timeout 60 \
  --set-env-vars "PAYMENT_FACILITATOR=goplausible,PAYMENT_MODE=testnet"
```

Then set **secrets** in Cloud Run (Console → Service → Edit → Variables & secrets), not in git:

- `DATABASE_URL` (Neon)  
- `PAYTO_ADDRESS`  
- `PAYMENT_NETWORK` / `USDC_ASA_ID`  
- `FACILITATOR_URL`  
- `SESSION_HMAC_SECRET`  
- `PUBLIC_API_BASE` = the `https://….run.app` URL Cloud Run prints  

### A5. Verify

```bash
curl https://<service>-<hash>-uc.a.run.app/healthz
```

Copy that URL → `PUBLIC_API_BASE` in notes + secrets.

### A6. Keep warm (optional)

Free cron (cron-job.org / UptimeRobot) → `GET /healthz` every **5–10 minutes** so challenge canaries don’t always hit cold start.

### A7. Scale later

When volume exceeds Free Tier: raise memory/CPU, or move the **same Dockerfile** to Fly/Northflank paid — no rewrite.

---

## Path B — Northflank Sandbox (if you want always-on free)

1. Sign up at [northflank.com](https://northflank.com/).  
2. Add a card (**verification only** — set billing alert to $0–1).  
3. Create project → **Service** from GitHub or Dockerfile.  
4. Stay on **Developer Sandbox** (2 free services, always-on, no sleep per their pricing).  
5. Inject same env/secrets as Cloud Run.  
6. Use the Northflank HTTPS URL as `PUBLIC_API_BASE`.

If Sandbox limits are unclear in the UI or it pushes you to paid: fall back to Cloud Run.

---

## Path C — Fly (~$2/mo) only if A and B fail

Same as `40` §1.C — last resort within ≤$5.

---

## Updated H0 host decision

```
Try:  Cloud Run (Always Free)  →  Northflank Sandbox  →  Fly (~$2)
Skip: Oracle, Koyeb (blocked for you)
Keep: Neon + R2 + Resend + Pages
```

Reply **`host = cloud-run`** or **`host = northflank`** when chosen, then continue Neon/wallets/GitHub from `40`.
