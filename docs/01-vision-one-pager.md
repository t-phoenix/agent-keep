# 01 — Vision / One-pager

## One sentence

**AgentKeep** is pay-per-call OS primitives (memory, artifacts, human notify, inbox, budget, fetch) so wallet agents can keep state and finish loops without signups or API keys.

## Problem

Wallet agents already pay for search, scrape, enrichment, models, and commerce.  
What they still lose between turns:

1. **State** — scratchpad evaporates when the session ends  
2. **Artifacts** — generated files have no durable URL to pass to the next tool  
3. **Human gates** — irreversible spend/post needs approve/deny without a dashboard  
4. **Money trust** — owners won’t fund agents without caps + receipts  
5. **Receive path** — agents can send email; they rarely have an inbox  
6. **HTTP glue** — auth-aware fetch / clean markdown is always needed

Crowded markets: search, scrape, prices, LLM proxies.  
Underserved: **continuity infrastructure** priced like a few cents of JSON.

## Insight (from live usage)

Agents don’t want exotic data. They want **access without accounts**.  
StableEnrich’s lesson applies: remove friction; register where agents already discover (x402scan / MPPScan); ship OpenAPI + `llms.txt` + skill.

Loop that wins: **research → decide → pay for one missing capability → continue**.

## Solution (MVP)

One origin. Six tiny paid endpoints + `/trust`. OpenAPI + **x402** (USDC on Base). Separate brand from AgentCash / Stable*.

| Endpoint | Job | Why universal |
|----------|-----|---------------|
| `POST/GET /memory` | Wallet-scoped KV | Continuity |
| `POST /artifacts` | File/JSON/image → durable URL + hash | Share outputs |
| `POST /notify` | Question → human approve/deny/answer | Escalation |
| `GET /inbox` (+ ack) | Receive inbound email for the agent | Close loops |
| `GET /budget` (+ caps) | Spend today, per-task cap, receipts | Owner trust |
| `POST /fetch` | URL → clean markdown/text | Always needed |

Price band target: **$0.001 – $0.02** per call (see pricing doc).

## Who it’s for

| Actor | Need |
|-------|------|
| **Autonomous agent** | Stateless HTTP, pay, get JSON, keep going |
| **Human owner** | Caps, receipts, notify channel, kill switch |
| **Agent framework author** | Drop-in skill / OpenAPI, no key provisioning |

## Who it’s not for

- Teams wanting a full “agent platform” with IDE, orchestration UI, multi-agent swarm
- Traders needing market data (use CoinGecko / Codex / etc.)
- Users who want free forever with OAuth dashboards

## Differentiation

| Crowded | AgentKeep |
|---------|-----------|
| Another search/LLM wrapper | Continuity + trust primitives |
| Subscription SaaS | Micropay per call |
| Dashboard-first | Agent-first (JSON + discovery files) |
| High-WTP enrichment | Commodity infra priced cheap, used often |

## Success (early)

1. Agents call AgentKeep **unprompted** after discovering via scanner / llms.txt  
2. Same wallet returns for `/memory` + `/artifacts` in one session  
3. Owners set a daily cap and **don’t** revoke funding out of fear  
4. Revenue follows **repeat infrastructure use**, not one-shot novelty

## Principles

1. **No signup** — wallet is identity  
2. **JSON in, JSON out** — humans optional except `/notify`  
3. **Cheap enough to call blindly** — `/trust` included so agents can preflight other origins  
4. **Receipts by default** — every paid call is ledgered  
5. **Wallet isolation** — never leak memory/artifacts across wallets  
6. **Boring wins** — glue > clever niche APIs for v1

## North-star metaphor

Not “trading bot.” Not “AI app.”  
**The locker + ledger + doorbell every agent rents by the call.**
