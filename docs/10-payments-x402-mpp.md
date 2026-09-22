# 10 — Payments: x402 (Algorand / GoPlausible)

Canonical product locks: [`21-prebuild-decisions.md`](21-prebuild-decisions.md).  
**Challenge eligibility overrides:** [`27-algorand-x402-challenge.md`](27-algorand-x402-challenge.md).

## Locked (challenge track)

| Item | Decision |
|------|----------|
| Rail | **x402 primary** (MPP later, optional — not for challenge) |
| Asset / network | **USDC on Algorand** — Mainnet ASA **31566704** · Testnet ASA **10458941** |
| Network ids | `ALGORAND_Mainnet_CAIP2` / `ALGORAND_Testnet_CAIP2` |
| Facilitator | **GoPlausible** (required for leaderboard / Bazaar) |
| Entry | **Composite** — one `payTo`, many routes |
| Challenge tag | `x402-global-challenge` in x402 `extra` |
| Env | Mainnet for scoring · Testnet for build |
| Owner | First settled pay |
| Free GETs | Session (15m) or wallet proof — never anonymous |
| Failure after pay | **`credited` spend offset** (7d) — not custodial cash, not on-chain refund |
| Deferred | Base / Coinbase CDP (post-challenge ADR) |

USDC ASA IDs confirmed via [Circle USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses). Circle is **not** the facilitator.

## Happy path

```
1. Agent → POST /v1/fetch (no pay)
2. Server → 402 + x402 requirements
   (USDC ASA, ALGORAND_*_CAIP2, amount, payTo, nonce, resource, extra.tag=x402-global-challenge)
3. Agent pays via Algorand wallet + GoPlausible facilitator
4. Agent retries with payment proof
5. Server verifies via GoPlausible → hard cap OK → execute → 200 + receipt + session
6. LedgerEntry status=settled · USDC lands in payTo
```

## Free authenticated path

```
1. Agent holds valid X-AgentKeep-Session from recent paid settle
2. GET /v1/memory/{key} or GET /v1/budget
3. Server validates session → wallet_id (algo:…) → execute (no new charge)
4. 401 if missing/expired; agent must pay any cheap route or re-prove
```

## Budget gate order

```
rate limit
  → identity (session | payment challenge)
    → verify payment if required (GoPlausible)
      → apply credit_minor toward this charge
        → hard daily cap check
          → execute
            → ledger settled | credited
              → refresh session
```

## Credits (not balances)

- Work fails **after** successful verify/settle → receipt `credited`, increment `credit_minor`  
- Next paid call: reduce amount due / mark paid from credit first  
- Expire unused credit after **7 days**  
- No withdraw, no transfer, no cash-out  

## Failure modes

| Case | Behavior |
|------|----------|
| Underpay | 402 `payment_insufficient` |
| Bad proof | 401/402 `payment_invalid` |
| Replay | 409 `payment_replay` |
| Cap exceeded | 403 `budget_exceeded` |
| Facilitator down / pause | 503 `payment_unavailable` |
| Wrong network / ASA | 402 `payment_invalid` |

## Verify details

- Clock skew ±60s  
- Nonce TTL 5m  
- Resource = `METHOD path` + body sha256 (mutating); GET = path+query  
- Amount ≥ route price (overpay OK, no refund)  
- Facilitator verify timeout ≤ ~10s → `payment_unavailable`  
- **Same Mainnet payTo** for all Composite routes for the whole competition  

## Receipt shape

```json
{
  "receipt_id": "…",
  "route": "POST /v1/fetch",
  "money": {
    "amount": 10000,
    "decimals": 6,
    "asset": "USDC",
    "network": "ALGORAND_Mainnet_CAIP2",
    "asa_id": 31566704
  },
  "status": "settled",
  "request_id": "…",
  "created_at": "…"
}
```

(`asa_id` optional in JSON until OpenAPI spike locks it; network string is required.)

## Composite / Bazaar

- Each paid route: own price + **concrete** description (what the caller gets).  
- Server: Bazaar discovery extension enabled once.  
- Tag: `x402-global-challenge`.  
- One root domain per merchant / payTo (never multi-domain under one payTo).  

## Owner & caps

See `21` §B. Cap changes require channel OTP. Kill switch = daily 0.

## Scanner / challenge checklist

- [ ] Public HTTPS API base (Fly)  
- [ ] OpenAPI URL  
- [ ] payTo set + USDC opted in  
- [ ] GoPlausible settle path  
- [ ] Bazaar listing + challenge tag  
- [ ] Leaderboard visible (hackathon filter)  
- [ ] llms.txt + skill  
- [ ] Challenge form + Electric Capital GitHub  

## Client tooling

| Tool | Role |
|------|------|
| Algorand Foundation x402 demo client | Reference canary |
| AgentCash | Use if Algorand rail supported; else Foundation client |
| Circle | ASA ID reference only |
