# AgentKeep — Agent Skill

Use AgentKeep for continuity, human approval, receipts, fetch, and trust probes — wallet pay, no API keys.

## Base

- API: your deployed `PUBLIC_API_BASE` (HTTPS)
- Discovery: `/.well-known/x402`, `/llms.txt`, `/agents.md`
- Auth: x402 (**USDC on Algorand Mainnet**, GoPlausible) + `X-AgentKeep-Session` (15m after paid settle)
- Network: `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=` · ASA `31566704`
- Tag: `x402-global-challenge`
- Errors: branch on `error.code`

## Rules

1. On `402`, pay **Mainnet** USDC and retry with proof; store returned session for free GETs.
2. Do not use Testnet against the challenge deployment.
3. Do not use for search/enrichment/LLM/commerce.
4. Never store seeds/passwords; artifact URLs are public.
5. Before irreversible actions: `POST /v1/notify` — requires owner-bound channel.
6. On `budget_exceeded` or `channel_not_bound`, stop and escalate to owner.
7. Default daily hard cap is $2 USDC until owner raises via OTP.

## Tools

### Memory
- PUT `$0.001` · GET free+session · DELETE `$0.0005` · LIST `$0.001`
- Keys like `task:{id}:{name}` · default TTL 7d

### Artifacts
- POST with `max_bytes` · `$0.005 + $0.002/MiB` · public URL 90d

### Notify
- Bind first: `POST /v1/owner/bind/email` `$0.01` body `{ "email": "you@…" }`
- POST `$0.02` `{ question, max_wait_seconds }` — owner gets Approve/Deny email when Resend configured
- Poll GET `$0.0002` until approved|denied|answered|timeout|cancelled

### Inbox
- GET `$0.002` → note `inbox_address` · ack `$0.0005`
- Inbound email only

### Budget
- GET free+session → spent, daily_cap, credit_minor
- Receipts `$0.002`/page · statuses settled|credited|failed

### Fetch / Trust
- Fetch `$0.01` flat · Trust `$0.002` probe

### Owner
- bind/email, bind/telegram, otp, caps, delete

## Example

```
POST /v1/fetch + pay → session
PUT /v1/memory/task:1:summary + pay
GET /v1/budget (session)
POST /v1/owner/bind/telegram + pay → human opens deep_link
POST /v1/notify + pay → poll until approved
```

Send `Idempotency-Key` on paid mutates when retrying.
