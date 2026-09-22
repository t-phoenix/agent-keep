# 25 — Cheap infra guide (setup, config, connections)

**Goal:** Run AgentKeep for **~$10–25/mo staging**, **~$20–40/mo early prod**, without overbuilding.  
**Research:** Traditional PaaS pricing (2026) + AgentCash x402 market scan (2026-09).  
**Authority:** Product locks stay in `21`. This doc picks **default vendors** and **manual human steps**.  
**Build plan:** Phases in [`24-engineering-build-plan.md`](24-engineering-build-plan.md) reference this file.

---

## 1. What AgentKeep actually needs

| Capability | Why | Cheap fit |
|------------|-----|-----------|
| Always-on Node/TS HTTP | x402 verify, sessions, workers | PaaS container (not serverless-only) |
| Postgres | wallets, ledger, memory, tickets | Managed Postgres (Neon / Railway / Render) |
| Object storage | public artifacts | **Cloudflare R2** (no egress fees) |
| Optional Redis | rate limits / session cache | Upstash free → paid |
| Outbound email | notify / OTP | Resend free tier |
| Inbound email | inbox | Resend/Postmark inbound (P10/P12) |
| Static docs / owner pages | llms, skill, confirm links | Cloudflare Pages (free) |
| Secrets | CDP, payTo, DB | Host secret store + password manager |

**Not required for v1:** multi-region, K8s, GPU, dedicated Redis cluster, AWS account sprawl.

---

## 2. Market options (cheap)

### 2.1 Traditional PaaS / DB / blob (recommended shortlist)

Approx **2026 floors** for a tiny always-on API (verify on vendor sites before paying):

| Piece | Option | ~Floor | Pros | Cons |
|-------|--------|--------|------|------|
| API | **Fly.io** shared-cpu 512MB | ~$3–6/mo | Cheapest always-on; Docker-native | Managed Postgres expensive; DIY DB ops if self-host |
| API | **Railway** Hobby | ~$5 + usage | App + Postgres one project; easy | Bills can creep; watch usage |
| API | **Render** Starter | ~$7/mo | Predictable; you already use Render | Free tier spins down; paid workspace nuances |
| API | Cloudflare Workers | ~$5 paid | Ultra cheap at volume | **Weak fit** for CDP/Node + long fetch/notify workers |
| Postgres | **Neon** | Free → ~$0–19 | Branching, serverless, great staging | Cold start; another vendor |
| Postgres | Railway / Render add-on | ~$7–13 | Same dashboard as app | Tied to PaaS |
| Blob | **Cloudflare R2** | Free tier; ~$0.015/GB-mo | **No egress** — critical for public artifacts | Custom domain at P12 |
| Redis | **Upstash** | Free tier | Serverless, simple | Optional until rate-limit needs it |
| Email | **Resend** | Free tier | Simple API | Custom domain SPF/DKIM at P12 |
| Docs | **Cloudflare Pages** | Free | Same CF account as R2 | — |

### 2.2 AgentCash / x402 infra scan (what we found — and what we skip)

Queried AgentCash for hosting/storage/compute. Relevant hits:

| Origin | What it is | Price signal | Use for AgentKeep? |
|--------|------------|--------------|-------------------|
| `storage.gedx402.com` | Put/get artifacts on R2 via x402 | ~$0.002–0.005 / mutate | **No as primary** — we are the storage product; don’t outsource tenancy |
| `storage.mpp.tempo.xyz` | S3/R2-compatible paid storage | metered | Same — optional emergency only |
| `agntos.dev` `/compute/servers` | Instant Linux VPS via USDC | ~$6 | **No for prod API** — no managed Postgres/story; OK for one-off experiments |
| `vm402.com` | Metered anonymous VMs | ~$0.01/credit-hr | Same — sandbox only |
| `cloud.hyrule.host` | Pay-per-use VMs | from ~$0.20 | Same |

**Conclusion from AgentCash:** x402 “rent a box” is great for agents, **bad** as AgentKeep’s control plane. We need stable hostname, managed DB backups, and secrets — classic cheap PaaS + R2 + Neon.

---

## 3. Locked default stack (until ADR says otherwise)

**Constraint (2026-09-21):** Prefer **ongoing free allowances** (reset monthly / always-free), **not** time-boxed trials. Verified against vendor docs.

| Layer | Default | Free character | Notes |
|-------|---------|----------------|-------|
| API + worker | **Try-order:** Cloud Run → Northflank → Fly | Ongoing free preferred | See `40c` (Oracle/Koyeb skipped) |
| API preferred free | **Google Cloud Run** | Always Free monthly | Docker + HTTPS; scale-to-zero |
| API always-on free | **Northflank Sandbox** | Ongoing sandbox | Card for verify |
| API paid-cheap | **Fly.io** shared-cpu-1x 256MB | Not free for new accounts | Last resort ≤$5/mo |
| Postgres | **Neon Free** | Permanent free plan | 0.5 GB / 100 CU-hrs/mo; scale-to-zero after 5m idle |
| Blob | **Cloudflare R2** | Forever-free monthly caps | 10 GB + 1M Class A / 10M Class B; **$0 egress** |
| Docs / owner web | **Cloudflare Pages** | Free | |
| Email | **Resend** Free | Ongoing free send quota | Custom domain later |
| Redis | skip → **Upstash** free if needed | Ongoing free tier | Optional |

### Do not use (for this constraint)

| Vendor | Reason |
|--------|--------|
| **Fly as “free host”** | New orgs only get a **time-bound trial** ([Fly free trial](https://fly.io/docs/about/free-trial/)) — not an ongoing free tier |
| **Render** | Free tier exhausted for this operator; sleeps on free |
| **Railway Trial** | $5 / 30 days is time-bound; Free plan after is only **$1/mo credit** — usually too little for always-on |
| Workers-only on Free | 10 ms CPU/request — too tight for GoPlausible verify + Postgres |
| x402 VPS as control plane | Unstable for merchant HTTPS + secrets |

**Recommendation (try-order):**  

1. **Google Cloud Run** (Always Free monthly — easiest) → see [`40c-easy-free-host-cloudrun.md`](40c-easy-free-host-cloudrun.md)  
2. **Northflank Sandbox** (always-on free; card for verify)  
3. **Fly.io** ~$2/mo last resort  

Oracle / Koyeb: skip if unavailable. Ceiling **≤ $5/mo**; target **~$0**.

| Priority | API host | Ongoing free? | Notes |
|----------|----------|---------------|-------|
| 1 | **Google Cloud Run** | Yes (monthly Always Free) | Docker + HTTPS; scale-to-zero; free-tier region |
| 2 | **Northflank Sandbox** | Yes | Always-on; card verify |
| 3 | **Fly.io** smallest Machine | No | ~$1.94/mo |

**Data plane (keep):** Neon Free + R2 + Pages + Resend.

**Budget target**

| Env | Target monthly |
|-----|----------------|
| Local | $0 (Docker) |
| Challenge | **~$0** (Oracle or Koyeb) |
| Fallback | **≤ $5** (Fly + free data plane) |

---

## 4. Easy topology (pre-domain)

```
[Agent wallet — Algorand]
     │
     ▼
[Oracle | Koyeb | Fly]  apps/api  ◄── DATABASE_URL ──► [Neon Postgres]
     │                   (GoPlausible facilitator for x402)
     │
     ├── ARTIFACTS ──► [Cloudflare R2] ── public URL (r2.dev until P12)
     │
     ├── EMAIL ──► [Resend]
     │
     └── OWNER PAGES ──► same service or [CF Pages]
```

Env vars (names only):

```
PUBLIC_API_BASE=https://<oracle-or-koyeb-or-fly-host>
OWNER_WEB_BASE=https://<host-or-pages>
ARTIFACTS_BASE=https://<r2-public-or-api>/…
DATABASE_URL=
PAYMENT_FACILITATOR=goplausible
PAYMENT_NETWORK=ALGORAND_Testnet_CAIP2|ALGORAND_Mainnet_CAIP2
USDC_ASA_ID=10458941|31566704
PAYTO_ADDRESS=
FACILITATOR_URL=
PAYMENT_MODE=testnet|mainnet
PAYMENT_PAUSE=false
SESSION_HMAC_SECRET=
EMAIL_API_KEY=
EMAIL_FROM=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
TELEGRAM_BOT_TOKEN=
# CDP_* deferred post-challenge
```

---

## 5. Manual setup & connection steps (human)

Do these when the build plan phase calls for them. AI drafts config; **you** click consoles and paste secrets into the host vault — never into git/chat.

### 5.1 Local (P1–P2) — zero cloud cost

1. Install Docker Desktop.  
2. From repo: `docker compose up -d` (Postgres ± MinIO).  
3. Copy `.env.example` → `.env.local`; set `DATABASE_URL=postgres://…localhost…`.  
4. `pnpm install && pnpm dev` → open `http://localhost:8787/health` (port per ADR).  
5. Reply phase gate when health is green.

### 5.2 Neon Postgres (P2)

1. Sign up at [neon.tech](https://neon.tech).  
2. Create project `agentkeep`.  
3. Create branch `staging`.  
4. Dashboard → Connection string → copy URI.  
5. Store as `DATABASE_URL_STAGING` in password manager.  
6. In Fly → `fly secrets set DATABASE_URL=…` (or Railway backup).  
7. Enable automations/backups if offered on free/paid plan.  
8. Test: host console or local `psql "$DATABASE_URL" -c 'select 1'`.

### 5.3 Railway (if chosen — P2)

1. Sign up → New Project → Empty.  
2. Add service from GitHub repo (root or `apps/api`).  
3. Add variables from vault (at least `DATABASE_URL`).  
4. Deploy; copy public URL → `PUBLIC_API_BASE` / `OWNER_WEB_BASE`.  
5. Optional: Railway Postgres instead of Neon (one less vendor).  
6. Settings → generate shared token only if CI deploy needed.

### 5.4 Fly.io (default — H0 / H4)

1. Install `flyctl`; `fly auth login` (**new account** preferred for fresh free allowance).  
2. `fly apps create agentkeep-staging`.  
3. `fly secrets set DATABASE_URL=… PAYTO_ADDRESS=… PAYMENT_NETWORK=… USDC_ASA_ID=… FACILITATOR_URL=… SESSION_HMAC_SECRET=…`  
4. `fly deploy` from Dockerfile.  
5. Note `https://agentkeep-staging.fly.dev` → set base URL envs.  
6. **Do not** use Fly Managed Postgres at $38 for MVP — use Neon.  
7. Mainnet challenge: public HTTPS required; flip `PAYMENT_NETWORK` + ASA to Mainnet values.

### 5.5 Render — **do not use**

Render free tier is exhausted for this operator. Skip unless a future ADR reopens it.

### 5.6 Cloudflare R2 (artifacts / H7)

1. Cloudflare dashboard → R2 → Create bucket `agentkeep-artifacts-staging`.  
2. Settings → Public access / r2.dev subdomain **or** serve via API.  
3. Manage R2 API Tokens → create read/write token for that bucket.  
4. Store `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.  
5. Set `ARTIFACTS_BASE` to the public base (r2.dev URL or `https://<api>/a`).  
6. Inject secrets into host; redeploy.  
7. Smoke: upload via API → open public URL in browser.

### 5.7 Resend email (P8)

1. Sign up Resend → API Keys → Create.  
2. Store `EMAIL_API_KEY`.  
3. Use onboarding/`@resend.dev` from-address until P12.  
4. Set `EMAIL_FROM`, `OWNER_WEB_BASE=https://<staging-host>`.  
5. Send test from dashboard; confirm inbox.  
6. **P12 later:** Add domain `mail.agentkeep.app` → paste SPF/DKIM DNS → verify → switch `EMAIL_FROM`.

### 5.8 Telegram (P9)

1. BotFather → `/newbot` → copy token → `TELEGRAM_BOT_TOKEN`.  
2. Set webhook:  
   `https://api.telegram.org/bot<token>/setWebhook?url=https://<staging-host>/internal/telegram/webhook&secret_token=<random>`  
3. Store `TELEGRAM_WEBHOOK_SECRET` same as `secret_token`.  
4. Open deep link from bind API on phone; confirm `/start`.

### 5.9 Upstash Redis (optional)

1. Create database → copy REST or Redis URL.  
2. Set `REDIS_URL` on host.  
3. Only when rate-limit/session store needs it.

### 5.10 Cloudflare Pages (docs) — optional early

1. Pages → Create → connect repo `docs/discovery` or static export.  
2. Use `*.pages.dev` until P12 custom domain.

### 5.11 Domain + DNS cutover (P12 only)

See `24` H12.1–H12.2. Summary:

1. Buy `agentkeep.app` (+ `.net`).  
2. Cloudflare DNS: `api`, `artifacts`, `@`, MX `inbox`, SPF/DKIM.  
3. Attach custom domain to R2 + Pages + API host.  
4. Flip env bases to final URLs; redeploy; canary.

---

## 6. Connection checklist (copy/paste)

After each vendor is live, confirm:

| Check | Command / action |
|-------|------------------|
| API up | `curl -sS "$PUBLIC_API_BASE/health"` |
| DB | migrate job succeeds in deploy logs |
| R2 | upload → `curl -I "$ARTIFACTS_BASE/<id>"` |
| Email | receive bind magic link |
| Telegram | receive notify button |
| Secrets | not present in GitHub repo search |

---

## 7. What AI may do vs human

| AI 🤖 | Human 👤 |
|-------|----------|
| Dockerfile, compose, `.env.example` | Create Neon/Fly/CF accounts (new free tiers) |
| ADR draft recommending stack | Approve ADR; enter card if required |
| Wire SDK clients behind interfaces | Paste secrets into host vault |
| Document exact click-paths in PR | Execute click-paths; reply `P{N} human done` |
| Estimate bill from sizing | Set billing alerts ($20 staging, $50 prod) |

---

## 8. Billing alerts (do once per vendor)

1. Fly (and Railway if used): set spend cap / email alert at **$20**.  
2. Neon: alert on compute hours if leaving free.  
3. Cloudflare: R2 class A/B op alerts.  
4. Resend: monthly send cap alert.

---

## 9. Decision record (fill in P2)

| Choice | Pick | Date | Human |
|--------|------|------|-------|
| API host | **Fly.io** (locked) | 2026-09-21 | |
| Postgres | **Neon** (locked) | 2026-09-21 | |
| Blob | R2 (default) | 2026-09-21 | |
| Email | Resend (default) | 2026-09-21 | |
| Redis | none / Upstash | | |
| Payment | GoPlausible + Algorand USDC | 2026-09-21 | |

**Locked stack:** **Fly + Neon + R2 + Resend + CF Pages**. Railway = backup only. **No Render.** Avoid Workers-only and x402 VPS as primary.

---

## Related

- Hackathon: `27`, `28`  
- Build phases: `24` (edge cases); calendar in `28`  
- Architecture: `16`, `22`  
- ADRs: `adr/README.md`  
