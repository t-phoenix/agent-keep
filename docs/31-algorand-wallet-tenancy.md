# 31 — Algorand wallet tenancy

**Status:** Stub — product law for challenge identity  
**Authority:** `21` §A + `27` · this file for address rules

---

## 1. Wallet id

```
wallet_id = "algo:" + canonicalize(address)
```

**Canonicalize (v1):**

1. Reject empty / non-string.  
2. Trim whitespace.  
3. Validate Algorand address checksum (library).  
4. Store **lowercase** form if the address alphabet allows; if case-sensitive encoding is required by the SDK, store the SDK’s canonical string and compare with constant-time equality after normalize.  
5. Never accept EVM `0x` addresses on challenge track.

---

## 2. Binding proof → wallet

| Source | Rule |
|--------|------|
| Settled GoPlausible proof | `payer` address → `wallet_id` |
| Session token | Bound to `wallet_id` at mint; cannot switch wallets |
| Cross-wallet resource id | Always **404** (no existence leak) |

Owner = first wallet that successfully settles any paid route for that tenant row.

---

## 3. Forbidden

- Trusting client-supplied `wallet` query/body without proof  
- Serving memory/inbox across `algo:` ids  
- Mixing Base and Algorand tenants in one row without migration ADR  

---

## 4. Tests

| Case | Expect |
|------|--------|
| Wallet A pays; B session reads A key | 404 |
| Invalid address in proof | `payment_invalid` |
| Session for A used with B proof | reject / 401 |

---

## Related

- `07` data model · `11` threat model · `27` eligibility  
