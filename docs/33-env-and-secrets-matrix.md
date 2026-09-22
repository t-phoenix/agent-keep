# 33 — Env & secrets matrix

**Status:** Stub — expand as H0 accounts are created  
**Rule:** Never commit secrets. Names only in git (`.env.example`).

---

## 1. Matrix

| Variable | Required | Where set | Secret? | Notes |
|----------|----------|-----------|---------|-------|
| `PUBLIC_API_BASE` | Y | Fly env | N | `https://….fly.dev` until P12 |
| `OWNER_WEB_BASE` | Y | Fly / Pages | N | |
| `ARTIFACTS_BASE` | H7+ | Fly | N | R2 public base |
| `DATABASE_URL` | Y | Fly secrets ← Neon | **Y** | Pooled URI |
| `PAYMENT_FACILITATOR` | Y | Fly | N | `goplausible` |
| `PAYMENT_NETWORK` | Y | Fly | N | CAIP2 string |
| `USDC_ASA_ID` | Y | Fly | N | `10458941` / `31566704` |
| `PAYTO_ADDRESS` | Y | Fly | N* | Address public; **seed never stored in env** |
| `FACILITATOR_URL` | Y | Fly | N | Official GoPlausible URL |
| `PAYMENT_MODE` | Y | Fly | N | `testnet` \| `mainnet` |
| `PAYMENT_PAUSE` | N | Fly | N | Kill switch |
| `SESSION_HMAC_SECRET` | Y | Fly secrets | **Y** | Rotate = invalidate sessions |
| `EMAIL_API_KEY` | H7 notify | Fly secrets | **Y** | Resend |
| `EMAIL_FROM` | H7 | Fly | N | |
| `R2_ACCOUNT_ID` | H7 | Fly secrets | **Y** | |
| `R2_ACCESS_KEY_ID` | H7 | Fly secrets | **Y** | |
| `R2_SECRET_ACCESS_KEY` | H7 | Fly secrets | **Y** | |
| `R2_BUCKET` | H7 | Fly | N | |
| `TELEGRAM_BOT_TOKEN` | optional | Fly secrets | **Y** | Slip OK |

\* `PAYTO_ADDRESS` is not confidential, but treat payer **mnemonics** as offline-only (hardware / Pera — never CI).

---

## 2. Human vault checklist

- [ ] Mainnet payTo seed offline  
- [ ] Canary payer seed offline  
- [ ] Neon password  
- [ ] Fly API token (CI only if needed)  
- [ ] R2 token  
- [ ] Resend key  

---

## 3. Local vs staging vs mainnet

| Env | Network | ASA | PUBLIC_API_BASE |
|-----|---------|-----|-----------------|
| local | Testnet | 10458941 | `http://localhost:…` (not for leaderboard) |
| staging | Testnet | 10458941 | Fly HTTPS |
| challenge prod | Mainnet | 31566704 | Fly HTTPS |

---

## Related

- `25` infra · `28` H0 · `27` human ops  
