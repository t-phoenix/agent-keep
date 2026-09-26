# 46 — Domain: `agentkeep.online` (Namecheap → site + API)

**Bought:** Namecheap · **Product name unchanged:** AgentKeep  
**Hosts now:** marketing `https://agentkeep.online` · API `https://api.agentkeep.online`  
(`PUBLIC_API_BASE` / Bazaar resource URLs). The `*.run.app` URL still serves the same Cloud Run service. Do **not** rotate `payTo`.

Related: `45`, `02`, `brand/guidelines.md`

---

## Architecture (recommended)

| Host | Role | When | Provider |
|------|------|------|----------|
| `agentkeep.online` | Marketing site | **Now** | Cloudflare Worker (`agentkeep-web`) |
| `www.agentkeep.online` | Same site, redirect to apex | **Now** | Same Worker + Redirect Rule |
| `api.agentkeep.online` | API | **After** the challenge usage window | Cloud Run `agent-keep` (`europe-west1`), DNS-only CNAME |
| `agent-keep-684642514120.europe-west1.run.app` | Live x402 API | **Now and through the window** | Cloud Run — this is the form / Bazaar URL |

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
3. Cloudflare’s Git connector is **Workers Builds**. It runs `npx wrangler deploy` from the repo root after the build. That command only reads a Wrangler file in the root, so the config lives at `wrangler.jsonc` (assets: `apps/web/out`). Leave the deploy command as the default.

   | Field | Value |
   |-------|--------|
   | Root directory / Path | `/` (repo root) |
   | Build command | `pnpm install && pnpm --filter @agentkeep/web build` |
   | Deploy command | `npx wrangler deploy` |
   | Non-production branch deploy command | `npx wrangler versions upload` |

   There is no separate “build output directory” field. Set `NODE_VERSION=20` if the builder offers it.

4. Environment variables (Pages → Settings → Environment variables):

   ```
   NEXT_PUBLIC_SITE_URL=https://agentkeep.online
   NEXT_PUBLIC_API_BASE=https://agent-keep-684642514120.europe-west1.run.app
   ```

5. Deploy → note `*.pages.dev` URL → smoke test.

### B2. Custom domain on the Worker (do this after the zone is Active)

Worker project name: `agentkeep-web`.

1. Confirm the `*.workers.dev` URL loads the landing page first.  
2. Worker → **Domains** (or **Settings → Domains & Routes**) → **Add → Custom domain**.  
3. Add `agentkeep.online`, then add `www.agentkeep.online`. Cloudflare creates the DNS records (proxied).  
4. Domain `agentkeep.online` → **Rules → Redirect Rules**: `www` → `https://agentkeep.online` (301).  
5. Domain → **SSL/TLS → Overview** → **Full (strict)**.  
6. Do not create a manual apex A/CNAME to Cloud Run. The apex is the marketing site.

### B3. Local preview before deploy

```bash
cd ~/Desktop/AgentKeep
pnpm --filter @agentkeep/web dev
# http://localhost:3000
```

---

## C. API on `api.agentkeep.online` (defer until post-challenge)

When ready (after October window or after form if you accept URL change):

Do **not** change `PUBLIC_API_BASE`, `ARTIFACTS_BASE`, or the challenge form during the window. `OWNER_WEB_BASE` stays on the Cloud Run URL too — owner links are served by the API, not the marketing site.

1. GCP → Cloud Run → `agent-keep` (`europe-west1`) → **Manage custom domains** → map `api.agentkeep.online` only (not the apex).  
2. Google will show a CNAME (usually `api` → `ghs.googlehosted.com`).  
3. Cloudflare DNS: that CNAME must be **DNS only** (grey cloud). An orange-cloud proxy blocks Google’s certificate. SSL mode on the zone does not apply to grey-cloud records.  
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
