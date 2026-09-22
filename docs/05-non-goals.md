# 05 — Non-goals & anti-scope

If a request lands in this list, the answer is: **not in AgentKeep v1** (maybe never).

## Product anti-scope

| Do not build | Why |
|--------------|-----|
| Trading / sniping / memecoin bots | Category confusion; different risk & compliance |
| LLM inference proxy | Crowded; not our wedge |
| Web search / social search / enrichment | Crowded; high-WTP elsewhere |
| Multi-agent orchestration studio | Dashboard creep; loses “JSON cents” purity |
| End-user consumer app with feeds | Wrong buyer |
| Free forever tier with signup | Breaks wallet-native motion |
| Guaranteed legal archive / e-discovery | Wrong retention economics |
| Cross-wallet shared memory “social” | Isolation & abuse nightmare |
| General cloud object store competing with S3/R2 for humans | Agents need simple durable URLs, not IAM |
| Full Email Service Provider for marketers | Inbox is for agent loops, not campaigns |
| Phone tree / full CCaaS | Notify is escalation, not call center |

## API anti-patterns

- HTML marketing pages as API responses  
- Session cookies as primary auth  
- Undocumented routes for “VIP agents”  
- Silent price changes without OpenAPI/`llms.txt` update  
- Returning chain-specific weirdness without abstracting receipt fields  

## Scope creep watchlist (say no by default)

1. “Can we add embeddings search over memory?” → separate product  
2. “Can we run user Wasm?” → no  
3. “Can we host agent code?” → no  
4. “Can we be the payment wallet?” → no; we accept payments  
5. “Can we scrape JS-heavy apps like a full browser?” → `/fetch` is best-effort glue, not Browserbase  

## Positioning discipline

**We are required infrastructure**, not a novelty endpoint.  
If a feature doesn’t help **continuity, trust, or glue**, it waits.
