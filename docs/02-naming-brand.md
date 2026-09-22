# 02 — Naming & brand

## Locked name: **AgentKeep**

| Criterion | Fit |
|-----------|-----|
| Clear to humans | “Keep” = memory, files, budget, loops |
| Clear to AIs | Reads as agent infrastructure, not trading/memecoin |
| Distinct from AgentCash / Stable* / Rekt | Yes — **fully separate brand** |
| Fits x402 listing | Origin `agentkeep.app` |
| Pronounceable | Yes |

**Locked 2026-09-05.** Alternates archived in git if rename ever needed.

**Tagline options (pick one later):**

1. *Keep going.*  
2. *OS primitives for wallet agents.*  
3. *Memory, files, humans, receipts — pay per call.*  
4. *No keys. No dashboard. Keep state.*

---

## Brand voice

### For humans (owners, docs, landing)

- Direct, calm, infrastructure tone  
- Emphasize **trust** (caps, receipts, isolation)  
- Avoid hype, trading language, meme coin energy  
- Avoid purple-glow “AI SaaS” aesthetic when design starts

### For agents (`llms.txt`, `SKILL.md`, OpenAPI descriptions)

- Imperative and literal  
- Exact prices, exact paths, exact error codes  
- “When to use” / “when not to use”  
- No marketing adjectives (“blazing”, “revolutionary”)

**Good agent copy:**  
`PUT /v1/memory/{key} — store up to 64KiB. TTL optional. Scoped to paying wallet.`

**Bad agent copy:**  
`Unlock seamless persistent cognition for your autonomous workforce!!!`

---

## Origin / URL conventions (locked intent)

| Asset | Value |
|-------|-------|
| Product name | AgentKeep |
| Primary domain | **`agentkeep.app`** (intent; buy at **P12** after staging tests) |
| Backup domain | **`agentkeep.net`** (buy at P12 with primary) |
| Origin host | `https://api.agentkeep.app` |
| Docs | `https://agentkeep.app` |
| OpenAPI | `https://api.agentkeep.app/openapi.json` |
| llms.txt | `https://agentkeep.app/llms.txt` |
| skill | `https://agentkeep.app/skill.md` |
| Scanner listing name | `AgentKeep` |

**Taken (do not plan on):** `agentkeep.dev`, `.com`, `.io`, `.ai`, `keep.tools`, `agentkeep.xyz`.

**Brand rule:** No AgentCash / Stable* co-branding, nested paths, or “powered by” in v1 discovery copy.

---

## Visual direction (pre-design notes only)

Defer full brand kit. When design starts:

- One clear composition; brand name as hero signal  
- Infrastructure feel (precision, quiet), not agent-mascot cute  
- Avoid default AI purple gradients and cream+terracotta clichés  
- Logo should work as favicon + scanner avatar at 32px

---

## Naming checklist before public list

- [x] Name locked: AgentKeep  
- [ ] Purchase `agentkeep.app` + `agentkeep.net` **at P12** (after staging acceptance)  
- [ ] DNS cutover (api / artifacts / apex / inbox / mail) at P12  
- [ ] Twitter/X handle (optional)  
- [ ] Light trademark check (payments/infra — not password-manager category)  
- [ ] Name identical in OpenAPI `info.title`, llms.txt, x402scan  
- [x] Folder/repo already = AgentKeep
