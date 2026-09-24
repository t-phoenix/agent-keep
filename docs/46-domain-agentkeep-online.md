# 46 — Domain: `agentkeep.online` (Namecheap → site + API)

**Bought:** Namecheap · **Product name unchanged:** AgentKeep  
**Challenge week rule:** Marketing on `agentkeep.online`; **API stays** on  
`https://agent-keep-684642514120.europe-west1.run.app` until form + early October usage window. Do **not** rotate `PUBLIC_API_BASE` / Bazaar mid-window.

Related: `45`, `02`, `brand/guidelines.md`

---

## Architecture (recommended)

| Host | Role | Provider |
|------|------|----------|
| `agentkeep.online` / `www` | Marketing site (3D landing) | **Cloudflare Pages** |
| `api.agentkeep.online` | API (later cutover) | Cloud Run custom domain |
| Current `*.run.app` | Live x402 API **now** | Keep for challenge form |

```
Namecheap ──NS──► Cloudflare zone (agentkeep.online)
                      │
                      ├─ @ / www  → Cloudflare Pages (apps/web)
                      └─ api      → Cloud Run (defer)
```

---

## A. Point Namecheap DNS at Cloudflare (do this first)

1. Cloudflare dashboard → **Add a site** → `agentkeep.online` → plan **Free**.  
2. Cloudflare shows two nameservers, e.g. `ada.ns.cloudflare.com` / `bob.ns.cloudflare.com`.  
3. Namecheap → **Domain List** → `agentkeep.online` → **Manage** → **Nameservers** → **Custom DNS**.  
4. Paste both Cloudflare NS → save.  
5. Wait until Cloudflare zone status = **Active** (often 5–60 min, up to 24h).  
6. Cloudflare → **SSL/TLS** → **Full (strict)** once Pages has HTTPS (automatic).

*Alternative (simpler but less flexible):* keep Namecheap BasicDNS and CNAME `www` to Pages — Free Cloudflare still preferred for R2 + Pages + SSL.

---

## B. Deploy marketing site to Cloudflare Pages

### B1. From GitHub (preferred)

1. Push `apps/web` to public GitHub (already on `main`).  
2. Cloudflare → **Workers & Pages** → **Create** → **Pages** → Connect repo `agent-keep` (or your fork).  
3. Build settings (static export via `apps/web/next.config.ts` `output: 'export'`):
   - **Framework preset:** None (or Next.js — ignore SSR adapter; we export static HTML)
   - **Root directory:** `/` (repo root — pnpm workspace)
   - **Build command:** `pnpm install && pnpm --filter @agentkeep/web build`
   - **Build output directory:** `apps/web/out`
   - **Node version:** `20` (Pages → Settings → Environment variables → `NODE_VERSION=20`)

   *If monorepo root fails:* set root directory to `apps/web`, install `cd ../.. && pnpm install`, build `pnpm --filter @agentkeep/web build`, output still `out` relative to `apps/web`.

4. Environment variables (Pages → Settings → Environment variables):

   ```
   NEXT_PUBLIC_SITE_URL=https://agentkeep.online
   NEXT_PUBLIC_API_BASE=https://agent-keep-684642514120.europe-west1.run.app
   ```

5. Deploy → note `*.pages.dev` URL → smoke test.

### B2. Custom domain on Pages

1. Pages project → **Custom domains** → Add `agentkeep.online` and `www.agentkeep.online`.  
2. Cloudflare auto-creates DNS records (proxied orange cloud).  
3. Confirm `https://agentkeep.online` loads with logo + hero.

### B3. Local preview before deploy

```bash
cd ~/Desktop/AgentKeep
pnpm --filter @agentkeep/web dev
# http://localhost:3000
```

---

## C. API on `api.agentkeep.online` (defer until post-challenge)

When ready (after October window or after form if you accept URL change):

1. GCP → Cloud Run → `agent-keep` → **Manage custom domains** / Domain mappings → `api.agentkeep.online`.  
2. Follow Google’s DNS instructions (usually CNAME to `ghs.googlehosted.com` or given target).  
3. In Cloudflare DNS: create `api` CNAME as instructed; SSL Full strict.  
4. Update Cloud Run secrets:

   ```
   PUBLIC_API_BASE=https://api.agentkeep.online
   OWNER_WEB_BASE=https://agentkeep.online
   ARTIFACTS_BASE=https://api.agentkeep.online/a
   ```

5. Redeploy API → Mainnet canary against **new** base.  
6. Update Pages env `NEXT_PUBLIC_API_BASE`.  
7. Update Bazaar / form only if not mid-scoring.

---

## D. Email (Resend) on this domain — optional later

1. Resend → Domains → Add `agentkeep.online` (or `mail.agentkeep.online`).  
2. Add SPF / DKIM / DMARC records Cloudflare shows.  
3. Verify → set `EMAIL_FROM=notify@agentkeep.online`.

Until then keep `onboarding@resend.dev`.

---

## E. Challenge form fields

| Field | Value |
|-------|--------|
| Public HTTPS API | `https://agent-keep-684642514120.europe-west1.run.app` |
| Website / docs | `https://agentkeep.online` (once Pages live) |
| payTo | Mainnet address (secrets — never commit) |

---

## F. Checklist

- [ ] Cloudflare NS active for `agentkeep.online`  
- [ ] Pages deploy green  
- [ ] `https://agentkeep.online` + `www` HTTPS  
- [ ] Env points API at Cloud Run  
- [ ] Form uses Cloud Run for API  
- [ ] (Later) `api.` cutover + canary  
