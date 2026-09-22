# 15 — Success metrics

## North-star metric

**Weekly returning wallets that use ≥2 primitives**  
(e.g. memory + artifacts, or budget + notify)

This measures continuity infra, not novelty traffic.

## Product metrics

| Metric | Why |
|--------|-----|
| Paid calls / day | Top of funnel |
| Calls by route mix | Are we infra or just fetch proxy? |
| Returning wallet rate D1/D7 | Habit |
| Memory read/write ratio | Continuity health |
| Notify resolve rate + time | Human loop works |
| Cap hit rate | Owners are engaging risk controls |
| Receipt export count | Trust usage |
| 402→200 conversion | Payment UX |
| Error rate by code | Reliability |

## Business metrics

| Metric | Why |
|--------|-----|
| Gross revenue | |
| Revenue after rail fees | Real top line |
| Gross margin % | Price correctly |
| COGS by route | Raise fetch/artifact if needed |
| Refund rate | Payment policy quality |
| Scanner rank / uptime | Distribution |

## Anti-metrics (don’t optimize blindly)

- Raw call volume without returning wallets  
- Free-endpoint scrape traffic  
- Single-route dominance at 95%+ fetch (we became a scraper)  

## Launch gates (numeric proposals)

Before calling v1 “live” (see also GTM pilot gates in `26`):

1. Isolation + SSRF test suites green  
2. Pilot money table green (≥$25/7d, ≥5 wallets, returners, multi-primitive) — `26` §5  
3. One external agent completes flow using only discovery docs  
4. Margin model filled with real COGS  
5. Only then: domains + x402scan (`24` P12)  

## Review cadence

- Daily: errors, uptime, payment failures  
- Weekly: route mix, returning wallets, margin  
- Monthly: pricing + competitive scan  
