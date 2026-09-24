# 45 — Hackathon completion rules & launch packet

**Status:** Active checklist for Algorand Global x402 Challenge (Composite)  
**Authority:** `27` (eligibility) > this file for *submission ops* · Product law still `21`  
**Public API (do not rotate mid-window):** `https://agent-keep-684642514120.europe-west1.run.app`  
**payTo:** Mainnet Algorand receive address in host secrets — **never rotate during scoring**

Related: `27`, `28` (H5–H6), `26` (GTM), `02` (brand), `40` (human setup)

---

## 0. Challenge rules that matter (digest — re-read Official Rules before livestream)

| Rule | AgentKeep action |
|------|------------------|
| Entry type **Composite** | Many paid routes, **one** Mainnet `payTo` |
| Network / asset | Algorand **Mainnet** USDC ASA **31566704** |
| Facilitator | **GoPlausible** only for challenge |
| Tag | `x402-global-challenge` on paid 402s |
| Bazaar | Discovery enabled; concrete route descriptions |
| Public HTTPS | Live Cloud Run URL (custom domain optional for *marketing*; keep API base stable through early October) |
| Usage window | Submit by **Sept 30**; usage measured through **early October** (unannounced) |
| Honesty | Real service use for volume — no wash trading / spam that violates Official Rules |
| GitHub | Public repo with Algorand x402 middleware + how-to-call |
| Electric Capital | Submit public repo per Algorand tutorial |
| Branding | AgentKeep — **not** AgentCash |

Independent entrant — Official Rules on [algorand.co/global-x402-challenge](https://algorand.co/global-x402-challenge) win on conflict.

---

## 1. Pre-submit DoD (H5) — complete before form

### Product / ops
- [x] Mainnet settles on Memory, Fetch, Receipts, Trust, Artifacts, Notify, Bind-email  
- [x] Bazaar listings visible under challenge  
- [x] Tag `x402-global-challenge`  
- [x] Neon + Cloud Run + R2 + Resend wired  
- [ ] Daily canary green (`CANARY_ROUTES=memory,fetch,receipts,trust,artifacts`)  
- [ ] Screenshots saved: settle tx, Bazaar list, leaderboard (hackathon filter ON)

### Paper
- [ ] Challenge form filled ([submit](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA))  
- [ ] Electric Capital repo submit ACK  
- [ ] Form confirmation email archived  

### Form copy (draft — paste when ready)

**Entry type:** Composite  

**What payment unlocks:**  
Wallet-scoped OS primitives for AI agents — no signup, no API keys. Paid routes: memory (store/list/delete), artifacts (public durable URL), fetch (SSRF-safe URL extract), trust (x402 probe), budget receipts, owner-bound notify (email approve/deny), owner email bind. Free with session: memory GET, budget GET.  

**Who pays:** Agent wallets (runners) funded by human principals; pilot builders + internal Mainnet canaries.  

**Public base:** `https://agent-keep-684642514120.europe-west1.run.app`  
**payTo:** *(paste Mainnet address from secrets — never commit)*  
**Usage plan:** Daily Mainnet canaries; 3–5 pilot agents with `docs/discovery/SKILL.md`; Bazaar + Algorand Discord distribution through early October.  

---

## 2. H6 — Drive usage (after submit → early October)

1. Internal canary N times/day — honest calls only.  
2. Pilots: Cursor/Codex agents install skill.  
3. Keep Bazaar descriptions + tag; share Discord.  
4. Uptime: ping `/health` every 5–10 min.  
5. **Do not** rotate `payTo` or `PUBLIC_API_BASE` mid-window.  
6. Measure: settled USDC/day, unique payers, settle success %.  

---

## 3. Domain & marketing site — timing (important)

| Asset | When | Why |
|-------|------|-----|
| Buy `agentkeep.online` | **Done** (Namecheap) | See `46` |
| Marketing site on `agentkeep.online` | OK before/after form | SEO/GEO/AEO + humans |
| Point `api.agentkeep.online` → Cloud Run | **Prefer after** form + 48h stable canaries **or** keep Cloud Run URL in form through October | Challenge H6: don’t mid-window flip API base if already listed |
| Form field “public HTTPS” | Use **current Cloud Run URL** if submitting this week | Matches Bazaar settles already cataloged |

**Safe pattern for challenge week:**  
`agentkeep.online` = marketing + skill + logo; `llms.txt` stays on API host during challenge.  
`api` stays on `*.run.app` in submission + Bazaar until post–usage window, then cut over (P12).

---

## 4. Domain buy & DNS (human steps)

### 4.1 Buy
1. Registrar: Cloudflare Registrar (preferred — DNS stays in same account as R2/Pages) or Namecheap/Google Domains.  
2. Domain **`agentkeep.online`** bought — follow `46` for Cloudflare Pages.  
3. Auto-renew ON. WHOIS privacy ON.  
4. Do **not** enable email forwarding that conflicts with Resend later.

### 4.2 Cloudflare zone
1. Add site → `agentkeep.online` → Free plan.  
2. Copy NS to registrar; wait Active.  
3. SSL/TLS → **Full (strict)** once origins have certs.

### 4.3 Marketing frontend (Cloudflare Pages)
1. Build `apps/web` → Pages project `agentkeep-web`.  
2. Custom domain: `agentkeep.online` + `www` → Pages.  
3. Env: `NEXT_PUBLIC_API_BASE=https://agent-keep-684642514120.europe-west1.run.app` (challenge) or later `https://api.agentkeep.online`.

### 4.4 API custom domain (defer until cutover)
1. Cloud Run → Domain mappings → `api.agentkeep.online`.  
2. Cloudflare CNAME `api` → `ghs.googlehosted.com` (or mapping target Cloud Run shows) + proxy as docs require.  
3. Update secrets: `PUBLIC_API_BASE`, `OWNER_WEB_BASE`, `ARTIFACTS_BASE`.  
4. Redeploy; Mainnet canary against **new** base once; update form only if not yet submitted.  
5. Keep old `*.run.app` live 7 days as redirect if possible.

### 4.5 Resend / mail (later)
1. Resend → Domains → `mail.agentkeep.online` or root.  
2. Paste SPF/DKIM/DMARC.  
3. Flip `EMAIL_FROM` after Verified.

### 4.6 Optional NFD
Register NFD for Mainnet payTo for Bazaar merchant polish (does not replace domain).

---

## 5. Brand system (logo + voice)

| Item | Lock |
|------|------|
| Name | **AgentKeep** |
| Tagline (marketing) | *Keep going.* |
| Tagline (agents) | *OS primitives for wallet agents — pay per call.* |
| Voice | Calm infrastructure; trust (caps, receipts, isolation); no meme/trading/purple-glow AI SaaS |
| Primary mark | See `docs/brand/` (Agency concepts via StableStudio) |
| Avoid | Purple gradients, neon glow, generic robot mascots, Inter-only “AI startup” kits |

### Metadata everywhere
- `apps/web`: favicon, apple-touch, Open Graph, Twitter card  
- API HTML root + `llms.txt` / skill: link brand mark URL  
- GitHub social preview  
- Bazaar merchant website → `https://agentkeep.online` after launch  

---

## 6. Website goals — SEO + GEO + AEO

### SEO (classic)
- One H1, clear title/description, OG image = logo lockup  
- `/` humans · `/llms.txt` + `/agents.md` + `/skill` agents  
- Schema.org `SoftwareApplication` + `WebAPI` JSON-LD  
- Sitemap + robots allowing GPTBot / PerplexityBot / ClaudeBot (GEO)  
- Fast LCP; 3D behind `prefers-reduced-motion` fallback  

### GEO (generative engines)
- Citable short passages: what / for whom / prices / when-not-to-use  
- Brand mentions plan: Algorand Discord, x402 scanners, GitHub README  
- `llms.txt` authoritative  

### AEO (answer engines)
- FAQ block answering: “What is AgentKeep?”, “How do agents pay?”, “Algorand or Base?”  
- Speakable / FAQPage schema  
- Direct answers in first 40–60 words of each section  

---

## 7. Scrolltide-style hero brief (paste into Cursor / v0)

Site is **[Scrolltide](https://www.scrolltide.co/)** (scrolltide.co — cinematic React/R3F prompts). Closest vibe templates: **Synapse**, **Cortex**, **Halide** — adapt; do **not** copy purple AI kits.

**Prompt (AgentKeep hero):**

> Build a full-viewport scroll-driven hero for **AgentKeep**, a wallet-scoped OS for AI agents (memory, artifacts, notify, receipts) paid with x402 USDC on Algorand — no signup.  
> **Visual metaphor:** a quiet “keep” / vault of light — a matte charcoal torus or ring that slowly opens as the user scrolls, revealing a thin gold/amber filament (continuity) — not a robot, not a coin, not purple neon.  
> Stack: Next.js App Router, React Three Fiber, drei, GSAP ScrollTrigger (`scrub: true`), Lenis optional.  
> Typography: expressive non-Inter display (e.g. Fraunces or Instrument Serif) + clean mono for prices. Brand first: wordmark **AgentKeep** dominates the first viewport; one headline *Keep going.*; one supporting line; one CTA group (“Call the API” → live API base, “Agent skill” → /skill).  
> Background: deep graphite with subtle grain — no cream serif newspaper look, no purple-indigo gradients, no floating badge stickers on the 3D.  
> Motion: camera dolly + ring aperture on scroll chapters (Keep / Pay / Trust); respect `prefers-reduced-motion` with static poster.  
> Mobile: reduce draw calls; pause R3F when offscreen.  
> Below fold: use-cases grid, price table, FAQ (AEO), JSON-LD, footer with Algorand + GoPlausible + challenge tag as plain facts.

Store generated components under `apps/web/`.

---

## 8. Order of operations (this initiative)

1. 👤 Domain `agentkeep.online` owned — DNS via `46`.  
2. 🤖 Logo concepts via AgentCash/StableStudio → pick + export SVG/PNG → `docs/brand/` + site metadata.  
3. 🤖 Scaffold `apps/web` with GEO/AEO + Scrolltide-adapted hero.  
4. 👤 Cloudflare Pages + DNS for apex/www.  
5. Keep API on Cloud Run URL for form.  
6. 👤 Submit challenge form + Electric Capital.  
7. H6 usage.  
8. Post-window: `api.agentkeep.online` cutover.

---

## 9. Done means

- [x] Domain owned (`agentkeep.online`)  
- [ ] Logo locked + used in metadata  
- [ ] Marketing site live on `agentkeep.online` with SEO/GEO/AEO basics  
- [ ] Form + Electric Capital complete  
- [ ] Canaries still green on **unchanged** API base through October window  
