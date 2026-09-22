# 30 — GoPlausible facilitator adapter (contract stub)

**Status:** Stub — fill during H1 spike; no app code yet  
**Authority:** `27` > this file > OpenAPI headers after spike  
**Refs:** [x402 on Algorand guide](https://algorand.co/blog/the-x402-global-challenge-is-live-how-to-build-submit-your-entry), Foundation demo server

---

## 1. Responsibility

`FacilitatorClient` verifies and settles x402 payments for AgentKeep routes. Challenge track uses **GoPlausible only**.

```
verify(proof, challenge) → { ok, payer, amount, network, asaId, txId? }
settle(proof, challenge) → { ok, txId, payer }
```

Timeouts: ≤ ~10s → map to `payment_unavailable`.

---

## 2. Challenge payload fields (must emit on 402)

| Field | Value |
|-------|--------|
| scheme | x402 / per Algorand middleware |
| network | `ALGORAND_Testnet_CAIP2` or `ALGORAND_Mainnet_CAIP2` |
| asset / ASA | `10458941` (test) / `31566704` (main) |
| maxAmountRequired | route price minor units |
| payTo | single competition address |
| resource | `METHOD /path` (+ body hash rules from `10`) |
| extra.tag | **`x402-global-challenge`** |
| description | concrete per-route Bazaar text |

Exact wire header names: **TBD H1** from `@x402` / Algorand middleware — patch OpenAPI same PR.

---

## 3. Bazaar discovery

- Register resource-server discovery extension **once** on the HTTP server.  
- Per-route discovery declaration with description.  
- Merchant enrichment: site metadata + optional NFD (human).

---

## 4. Error mapping

| Facilitator outcome | Catalog code |
|---------------------|--------------|
| Invalid / wrong ASA / wrong network | `payment_invalid` |
| Insufficient | `payment_insufficient` |
| Replay | `payment_replay` |
| Timeout / 5xx | `payment_unavailable` |

---

## 5. Tests required before merge

- Mock verify success / fail / timeout  
- Replay rejected  
- Wrong payTo rejected  
- Tag present on 402 body/headers  

---

## 6. Out of scope

- Local facilitator  
- Coinbase CDP  
- Multi-payTo Composite (forbidden)  
