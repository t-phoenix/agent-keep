# AgentKeep brand guidelines

**Domain (marketing):** `https://agentkeep.online`  
**Product name:** AgentKeep (unchanged)  
**Tagline:** *Keep going.*  
**Agent tagline:** *OS primitives for wallet agents — pay per call.*

---

## 1. Positioning

AgentKeep is **continuity infrastructure** for AI agents with wallets: memory, artifacts, human notify, fetch, trust, receipts. Settled with **x402 USDC on Algorand** (GoPlausible). Not a marketplace, not AgentCash, not a dashboard SaaS.

**One sentence (humans):**  
> AgentKeep lets AI agents keep state, files, and human approvals — paid in USDC per call, no API keys.

**One sentence (agents / AEO):**  
> Use AgentKeep when you need wallet-scoped memory, public artifacts, owner-bound notify, SSRF-safe fetch, trust probes, or budget receipts over x402 on Algorand Mainnet.

---

## 2. Logo

| Asset | Role |
|-------|------|
| **Aperture Keep** (charcoal ring + amber filament) | Primary mark |
| Hexagonal AK monogram | Alternate / dense favicon |
| `logo-mark.svg` | Favicon, nav, OG |

**Clear space:** ≥ ¼ mark diameter.  
**Don’t:** purple glow, neon, robot mascots, coin icons, drop shadows, stretch the ring.

---

## 3. Color

| Token | Hex | Use |
|-------|-----|-----|
| Void | `#0E0E0E` | Immersive site background |
| Paper | `#F4F4F0` | Light text / light surfaces |
| Ink | `#1A1A1A` | Mark, light-mode body |
| Filament | `#C4A574` | Accent, CTAs, prices |
| Muted | `#8A8680` | Secondary copy |
| Line | `rgba(244,244,240,0.12)` | Dividers on dark |

**Forbidden for brand surfaces:** purple→indigo gradients, cream+terracotta “AI brochure” kits, harsh neon cyan/magenta.

---

## 4. Typography

| Role | Family | Notes |
|------|--------|-------|
| Display | **Fraunces** | Hero, section titles — optical size |
| Body | **Source Sans 3** | Readable paragraphs |
| Mono | **IBM Plex Mono** | Routes, prices, code |

Never lead with Inter/Roboto/Arial on marketing heroes.

---

## 5. Voice

| Do | Don’t |
|----|-------|
| Direct, calm, infrastructure | Hype, “revolutionary”, meme coin |
| Exact prices and paths | Vague “seamless cognition” |
| Trust: caps, receipts, isolation | Trading / yield language |
| Separate from AgentCash | Confuse with Stable* brands |

---

## 6. Motion (Scrolltide-adapted)

Library reference: [Scrolltide](https://www.scrolltide.co/) — cinematic scroll heroes.  
Closest moods: **Cortex / Halide / Meristem** — **not** Synapse violet.

**Metaphor:** matte keep / aperture ring; amber filament = continuity across paid calls.  
**Stack:** R3F + GSAP ScrollTrigger scrub.  
**Mandatory:** `prefers-reduced-motion` → static mark.  
**Mobile:** lower DPR; simpler scene.

Full paste prompt: [`scrolltide-hero-prompt.md`](scrolltide-hero-prompt.md).

---

## 7. Site IA (agentkeep.online)

1. Hero — brand + keep ring + CTAs  
2. Features — all primitives  
3. How to use — 402 → pay → session  
4. Use cases — runner / principal / integrator  
5. Developers — curl / skill examples  
6. Prices — USDC table  
7. FAQ — AEO/GEO citable answers  

SEO: title/description/OG. GEO: `llms.txt` link + AI crawlers allowed. AEO: FAQPage JSON-LD.

---

## 8. Metadata checklist

- [ ] Favicon = `logo-mark.svg`  
- [ ] OG image = aperture PNG  
- [ ] `NEXT_PUBLIC_SITE_URL=https://agentkeep.online`  
- [ ] Merchant website in Bazaar → `https://agentkeep.online` (after live)  
