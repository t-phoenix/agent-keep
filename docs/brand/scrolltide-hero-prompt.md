# Scrolltide-adapted hero prompt — AgentKeep

Source library: [Scrolltide](https://www.scrolltide.co/) (scrolltide.co — not .io). Closest public vibes: Synapse / Cortex / Halide — **do not** ship Synapse’s violet field; AgentKeep brand forbids purple-glow AI kits.

Implemented in `apps/web` (`Landing.tsx` + `HeroCanvas.tsx` + `HeroScene.tsx`). Paste this block when iterating further.

---

Build a full-viewport scroll-driven hero for **AgentKeep** (`https://agentkeep.online`), a wallet-scoped OS for AI agents (memory, artifacts, notify, receipts) paid with x402 USDC on Algorand — no signup.

**Visual metaphor:** a quiet “keep” / vault of light — a matte charcoal torus that slowly opens as the user scrolls, revealing a thin gold/amber filament (continuity) — not a robot, not a coin, not purple neon.

**Stack:** Next.js App Router, React Three Fiber, drei, GSAP ScrollTrigger (`scrub: true`), Lenis optional.

**Typography:** Fraunces (display) + Source Sans 3 (body) + IBM Plex Mono (prices). Brand first: wordmark **AgentKeep** dominates the first viewport; one headline *Keep going.*; one supporting line; one CTA group (“Call the API”, “Agent skill”).

**Background:** deep graphite `#0E0E0E` with subtle grain — no cream newspaper look, no purple-indigo gradients, no floating badges on the 3D.

**Motion:** camera dolly + ring aperture on scroll chapters (Keep / Pay / Trust); respect `prefers-reduced-motion` with static poster (`/brand/logo.png`).

**Mobile:** reduce DPR; pause R3F when offscreen.

**Below fold:** features, how-to, use cases, developer curl examples, price table, FAQ (AEO), JSON-LD, footer with Algorand + GoPlausible + `x402-global-challenge` as plain facts.
