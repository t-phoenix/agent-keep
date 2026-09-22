# 32 — Challenge submission packet (draft)

**Status:** Stub — fill before Sept 30 submit  
**Form:** [Submission form](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA) (live through Sept 30)  
**Also:** Electric Capital GitHub submit (public repo)

---

## 1. Entry metadata

| Field | Draft answer |
|-------|----------------|
| Project name | AgentKeep |
| Entry type | **Composite** |
| One-liner | Wallet-scoped OS primitives for agents — memory, fetch, budget receipts — paid per call via x402 on Algorand |
| Public HTTPS API | `https://<fly-app>.fly.dev` (update after H4) |
| OpenAPI URL | `https://<host>/openapi.json` (or repo `specs/openapi.yaml`) |
| payTo | `<MAINNET_ADDRESS>` (never rotate) |
| Facilitator | GoPlausible |
| Network | Algorand Mainnet · USDC ASA 31566704 |
| Challenge tag | `x402-global-challenge` |
| GitHub | `https://github.com/<org>/AgentKeep` (must be public) |

---

## 2. What payment unlocks

List shipped routes at submit time (thin MVP example):

1. `PUT /v1/memory/{key}` — store wallet-scoped value ≤64KiB  
2. `POST /v1/fetch` — SSRF-safe URL → markdown/text  
3. `GET /v1/budget/receipts` — export ledger receipts  
4. (Planned post-submit) artifacts, notify, inbox, trust  

Who pays: agent wallets / pilot builders running AgentKeep skill in loops.

---

## 3. Proof attachments (screenshots)

- [ ] Unpaid 402 with tag visible  
- [ ] Settled 200 + receipt  
- [ ] Explorer: USDC ASA credit to payTo  
- [ ] Bazaar listing (hackathon filter)  
- [ ] Leaderboard row  

---

## 4. Electric Capital

1. Repo public; Algorand x402 middleware + README “How to call”.  
2. Follow Algorand Foundation video tutorial for Electric Capital submit.  
3. Save confirmation.

---

## 5. Narrative for judges / finals

> Agents don’t need another SaaS account — they need continuity between paid calls. AgentKeep is a Composite x402 service: hard daily caps, wallet tenancy, session after settle, and primitives (memory/fetch/budget) that make agent loops reliable on Algorand.

---

## Related

- `27` eligibility · `28` H5 · Official Rules on challenge site  
