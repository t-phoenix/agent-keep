# 40 — Human setup checklist (infra · wallets · GitHub · config)

**Status:** Active — follow in order; reply `H0 human done` when §1–§4 are done  
**Budget:** Prefer **~$0**; ceiling **≤ $5/mo**; **no time-boxed free trials** as the long-term host  
**Client tooling:** Algorand Foundation x402 demo / docs — **not** AgentCash unless needed later  
**MVP scope:** **Full Composite** (all product routes in `21` / OpenAPI) — not thin cut

Related: `25` (vendors) · `27` (challenge) · `28` (phases) · `33` (env matrix)

---

## 0. Do we need Jev / jevai.org?

**No — not for AgentKeep v1 / the challenge.**

[Jev API](https://www.jevai.org/jev-api) is a **System One decision model** (structured Choice/Score/Noul in ms). AgentKeep is **wallet OS primitives** (memory, artifacts, notify, inbox, budget, fetch, trust) settled via **x402 on Algorand**.

| If you wanted… | Use |
|----------------|-----|
| Fast typed “decide / route / score” | Jev (separate product / optional later consumer) |
| Continuity + pay-per-call OS for agents | AgentKeep (this repo) |

Optional later: an agent *calling* AgentKeep could also call Jev — that does **not** belong inside AgentKeep’s paid surface for the hackathon.

---

## 1. Infra try-order (cheaper than ~$2, not time-based)

**Goal:** Public HTTPS API under **~$0**, never relying on a countdown trial.

| Priority | Host | Ongoing free? | Est. cost | When to abandon |
|----------|------|---------------|-----------|-----------------|
| **1** | **Google Cloud Run** | Yes — Always Free monthly | **$0** in quota | Prefer this when Oracle/Koyeb blocked — see [`40c`](40c-easy-free-host-cloudrun.md) |
| **2** | **Northflank Sandbox** | Yes — always-on sandbox | **$0** | Card for verify; set $0–1 alert |
| **3** | **Fly.io** smallest Machine | No | **~$1.94+/mo** | Last resort ≤$5 |
| ~~Oracle~~ | — | — | — | Unavailable for you — skip |
| ~~Koyeb~~ | — | — | — | Unavailable for you — skip |

**Always keep (all ~$0 ongoing):** Neon Free · Cloudflare R2 · Cloudflare Pages · Resend Free.

### 1.A Oracle Always Free — steps

**Create form walkthrough (field-by-field):** see [`40b-oracle-create-instance-form.md`](40b-oracle-create-instance-form.md) if you are on the Console create page (e.g. Hyderabad `ap-hyderabad-1`).

1. Sign up: [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) → create tenancy (Always Free lives in your **Home Region** — if Hyderabad is not home, switch region to home or create where Always Free applies).  
2. Console → **Compute → Instances → Create**.  
3. Shape: **VM.Standard.A1.Flex** · **2 OCPU** · **12 GB** RAM ([Always Free Ampere limit](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) — do **not** use 4/24).  
4. Image: **Canonical Ubuntu 24.04** (aarch64 / Always Free Eligible) — **not** Minimal Ubuntu.  
5. Networking: public subnet + **Assign a public IPv4 address**; open **22** and **443** in the subnet security list / NSG.  
6. SSH key: generate or upload; connect as `ubuntu`.  
7. Install Docker (or Node 22) + **Caddy** for HTTPS.  
8. Deploy AgentKeep; set env from §5.  
9. Confirm `curl https://<host>/healthz` → 200.  
10. Set OCI budget alert = **$0** / hard cap.

**If “Out of capacity”:** try other Availability Domains, then other Always Free–eligible regions, or skip to Koyeb (§1.B). Do not burn the week fighting Oracle.

### 1.B Koyeb Free — steps

1. Sign up at [koyeb.com](https://www.koyeb.com/).  
2. **Immediately** ensure you are on the plan that includes the **free Instance** (avoid leaving a Pro/paid default — check billing).  
3. Create **Web Service** from GitHub repo (or Docker).  
4. Instance type: **Free** (512MB / 0.1 vCPU) · region Frankfurt or Washington.  
5. Set env secrets (§5).  
6. Deploy; copy `https://<app>-<id>.koyeb.app` → `PUBLIC_API_BASE`.  
7. Note: free instance **scales to zero after 1h idle**. Add a canary cron (UptimeRobot / cron-job.org free) hitting `/healthz` every **≤45 min**.  
8. Confirm HTTPS + healthz.

### 1.C Fly (last resort, ≤$5) — steps

1. Only if Oracle + Koyeb both fail.  
2. `fly auth login` → create app → smallest `shared-cpu-1x` 256MB.  
3. Add payment method; expect ~**$2/mo** compute (trial is **not** your long-term plan).  
4. `fly secrets set …` · `fly deploy`.  
5. Use `https://<app>.fly.dev` as `PUBLIC_API_BASE`.

### 1.D Shared data plane (do these once)

| Service | Steps |
|---------|--------|
| **Neon** | neon.tech → New project `agentkeep` → copy pooled `DATABASE_URL` → host secrets |
| **R2** | Cloudflare → R2 → bucket `agentkeep-artifacts` → API token → `R2_*` + `ARTIFACTS_BASE` |
| **Pages** (optional) | CF Pages for owner confirm pages / static discovery |
| **Resend** | API key + `EMAIL_FROM` (use `@resend.dev` until custom domain) |

---

## 2. Public GitHub repo under your account

1. On GitHub: **New repository** → name `AgentKeep` (or `agentkeep`) → **Public** → **do not** add README if local repo already exists.  
2. Locally (from this folder):
   ```bash
   cd ~/Desktop/AgentKeep
   git init   # if not already a repo
   git add .
   git status   # ensure no .env / keys / mnemonics
   git commit -m "docs: AgentKeep Algorand x402 Composite entry"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/AgentKeep.git
   git push -u origin main
   ```
3. GitHub → Settings → **General**: confirm Public.  
4. Add topics: `algorand`, `x402`, `goplausible`, `usdc`.  
5. README already points at challenge docs — keep `PAYTO` / seeds **out** of git.  
6. Later (H5): submit this URL to **Electric Capital** + challenge form.  
7. Optional: GitHub Actions for `pnpm test` once code exists.

**Never commit:** `.env`, mnemonics, `SESSION_HMAC_SECRET`, R2 secrets, Neon passwords.

---

## 3. Algorand Testnet + Mainnet wallets (you do this)

### 3.1 Accounts to create (4)

| Role | Network | Purpose |
|------|---------|---------|
| **payTo** | Testnet | Receives test USDC during H1–H3 |
| **payer (canary)** | Testnet | Pays for test canaries |
| **payTo** | **Mainnet** | Competition receive address — **never rotate** |
| **payer (canary)** | Mainnet | Real USDC for first settle + volume |

Use [Pera Wallet](https://perawallet.app/) (mobile) or AlgoKit-generated accounts. Back up mnemonics offline only.

### 3.2 Testnet steps

1. Create Testnet payTo + payer in Pera (enable TestNet).  
2. Fund both with Testnet ALGO from Algorand dispenser.  
3. Opt both into **USDC ASA `10458941`**.  
4. Fund payer with Testnet USDC (dispenser / faucet paths from Foundation x402 guide).  
5. Save addresses (not seeds) as `PAYTO_ADDRESS` for testnet env.

### 3.3 Mainnet steps

1. Create **new** Mainnet payTo (do not reuse Testnet mnemonic for Mainnet habitually — separate keys).  
2. Fund with a little **ALGO** for fees / opt-in.  
3. Opt-in **USDC ASA `31566704`**.  
4. Create Mainnet canary payer; fund ALGO + **$10–30 USDC** for canaries/volume.  
5. Record Mainnet payTo as the **only** competition `PAYTO_ADDRESS` for prod.  
6. Optional: register **NFD** for Bazaar merchant polish.

### 3.4 First settlement proof (after deploy)

1. Unpaid call → 402 with tag `x402-global-challenge`.  
2. Pay with Foundation [x402 client / tutorial](https://dev.algorand.co/resources/x402-on-algorand/).  
3. Confirm USDC in payTo on explorer.  
4. Confirm Bazaar + leaderboard (hackathon filter).

---

## 4. Where these values land in the codebase

*(Paths appear when H1 scaffolds; names are frozen now.)*

| Config | File / place | Example |
|--------|--------------|---------|
| Env template | `.env.example` (committed) | Names only |
| Local secrets | `.env.local` / `.env` (**gitignored**) | Real values |
| Host secrets | Koyeb/Oracle/Fly secret store | Same keys as `.env` |
| Network + ASA | `PAYMENT_NETWORK`, `USDC_ASA_ID` | Testnet vs Mainnet |
| Receive address | `PAYTO_ADDRESS` | Mainnet payTo for challenge |
| Facilitator | `FACILITATOR_URL`, `PAYMENT_FACILITATOR=goplausible` | From Foundation / GoPlausible docs |
| Public URL | `PUBLIC_API_BASE` | `https://…` from host |
| DB | `DATABASE_URL` | Neon pooled URI |
| Session | `SESSION_HMAC_SECRET` | Random 32+ bytes |
| Route prices / tag | `apps/api` payment middleware + OpenAPI | `extra.tag=x402-global-challenge` |
| Canary mnemonic | **Never in API repo** — only on canary runner machine / 1Password | Foundation client `AVM_MNEMONIC` or equivalent |

**Flip Testnet → Mainnet:** change host secrets only (`PAYMENT_NETWORK`, `USDC_ASA_ID`, `PAYTO_ADDRESS`, `PAYMENT_MODE`) — no payTo rotation.

---

## 5. Full MVP route set (build all)

Per `21` / OpenAPI — **not** thin cut:

- Memory (PUT/GET/DELETE/list) + session  
- Artifacts  
- Notify (+ owner bind email; Telegram can slip slightly but plan in)  
- Inbox  
- Budget + receipts  
- Fetch + Trust  
- Owner caps / OTP / delete  

Calendar still follows `28`; if Sept 30 slips, ship Mainnet settle on core paid routes first, then finish remaining Composite routes without changing payTo.

---

## 6. Client / canary (Foundation, not AgentCash)

1. Follow [x402 on Algorand](https://dev.algorand.co/resources/x402-on-algorand/) + Foundation demo server/client.  
2. Use Testnet mnemonic env on **your laptop/CI canary only**.  
3. AgentCash: **out of band** until a concrete gap appears.

---

## 7. Done criteria for `H0 human done`

- [ ] Chose host: Oracle **or** Koyeb (or Fly only if both failed) — cost ≤ $5, prefer $0  
- [ ] Neon + (R2 if artifacts soon) + Resend created  
- [ ] Public GitHub repo URL  
- [ ] Testnet payTo + payer funded + USDC opted in  
- [ ] Mainnet payTo + payer ready (Mainnet USDC can wait until H4, but addresses created)  
- [ ] Non-secret notes: payTo addresses, `PUBLIC_API_BASE`, GitHub URL  

Then: say **`H0 human done`** and/or **`start H1`** to begin implementation.
