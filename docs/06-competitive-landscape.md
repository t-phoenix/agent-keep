# 06 — Competitive & category map

## Category definition

**Agent OS primitives / continuity infrastructure** delivered as micropay HTTP (x402/MPP).

Not: data APIs, model APIs, commerce gift cards, or agent frameworks.

---

## Landscape sketch

### Crowded (do not compete head-on in v1)

| Need | Examples | Note |
|------|----------|------|
| Web search | Exa, Tavily, Brave, Parallel | Call volume leaders |
| Scrape | Firecrawl, Oxylabs, Browserbase | Commodity + arms race |
| Social | glim.sh, StableSocial, twit.sh | High WTP niches |
| People data | Apollo, StableEnrich | High WTP |
| LLM | OpenAI, OpenRouter, DeepSeek, Perplexity | Money + volume |
| Images | fal.ai, StableStudio | Occasional |
| Markets | CoinGecko, Alchemy, Codex, Nansen | Domain-specific |
| Commerce | Bitrefill, molty.cash | Money leaders often |

### Adjacent / partial overlaps

| Player type | Overlap | Gap AgentKeep fills |
|-------------|---------|---------------------|
| AgentMail / email-for-agents | Inbox/send | We need receive + notify + budget + memory together |
| Pinata / IPFS / Tempo storage | Artifacts | Wallet-pay + receipt ledger + tight agent DX |
| Redis Cloud / KV SaaS | Memory | Signup + keys; not micropay-native |
| Traditional secret managers | KV | Wrong threat model for agent scratchpads |
| Spend management (corp cards) | Budget | Not agent-call granular; not x402 |
| Status/uptime monitors | Trust probe | Not payment-aware 402 preflight |

### Underserved bundle (our wedge)

| Primitive | Commodity alone? | Bundle value |
|-----------|------------------|--------------|
| Memory | Yes (KV hosts) | + wallet tenancy + pay-per-call |
| Artifacts | Yes (S3) | + no IAM + hash URL + receipts |
| Notify | Partial | + maxWait ticket semantics for agents |
| Inbox | Partial | + agent-addressable + poll API |
| Budget | Rare for agents | + per-route ledger |
| Fetch | Yes | + included so agents don’t leave origin |

**Moat thesis (honest):** execution + discovery distribution + reliability + isolation trust — not unique algorithms.

---

## Money vs volume lesson (apply to us)

- Call volume leaders ≠ money leaders.  
- Commodity wrappers race to bottom.  
- High-WTP is enrichment/commerce; **infra wins on frequency × low friction**.  
- Price AgentKeep to be **habitually callable** ($0.001–$0.02), not luxury data.

---

## Positioning statement

For **wallet-native AI agents** that need continuity and owner trust,  
AgentKeep is the **micropay OS primitive origin**  
that provides **memory, artifacts, human gates, inbox, budget, and fetch**  
unlike **single-purpose search/LLM/enrichment APIs**  
because it removes **signup/key friction** and ships where agents **already discover paid tools**.

---

## Competitive watch (ongoing)

Track monthly:

1. New x402/MPP origins launching KV/storage/inbox  
2. Budget-only helpers (e.g. x402helper-style spend APIs) expanding into memory/notify  
3. Agent mail products adding caps/receipts  
4. Scanner ranking changes (reputation, uptime)  
5. Payment rail fee changes affecting our floor price  

**GTM / validation before infra spend:** see [`26-users-competition-gtm-validation.md`](26-users-competition-gtm-validation.md).  
