# AgentKeep

Pay-per-call memory, fetch, receipts, trust, and human approval for wallet agents. No signup and no API key. Payment is x402 USDC on Algorand Mainnet through GoPlausible.

## Where

- Website: https://agentkeep.online
- API: https://api.agentkeep.online
- Prices and payment requirements: https://api.agentkeep.online/.well-known/x402
- Full instructions: https://api.agentkeep.online/llms.txt

## When to call

- Store or resume a value for the paying wallet between runs: PUT /v1/memory/{key}
- Read a public page as text: POST /v1/fetch with body { "url": "https://…" }
- Check that a URL responds before paying it elsewhere: GET /v1/trust?url=
- See what this wallet already spent: GET /v1/budget/receipts
- Ask the human owner to approve or deny: POST /v1/notify, then poll GET /v1/notify/{id}

## When not to call

Do not use AgentKeep for search, enrichment, chat, or image generation. Do not send Testnet payments to this API. Do not put seeds or passwords in memory or artifacts. Artifact URLs are public.

## How to pay

1. Call the path. HTTP 402 plus header PAYMENT-REQUIRED means you have not paid.
2. Pay the accepts[] entry. Scheme is exact. Asset is Algorand Mainnet USDC ASA 31566704. Facilitator is https://facilitator.goplausible.xyz.
3. Retry the same request with header PAYMENT-SIGNATURE.
4. Save response header X-AgentKeep-Session for 15 minutes. Use it on GET /v1/memory/{key} and GET /v1/budget.
5. On a paid retry, send Idempotency-Key so the retry is not a second charge.

Pay the amount in the live 402. The list above is the route map, not a price lock.
