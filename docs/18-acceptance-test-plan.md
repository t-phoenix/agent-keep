# 18 — Acceptance & test plan

Black-box tests that define “MVP done.” Locks: [`21-prebuild-decisions.md`](21-prebuild-decisions.md).

## A. Discovery

- [ ] `GET /openapi.json` documents all v1 routes including owner + trust  
- [ ] `llms.txt` + `skill.md` prices match OpenAPI  

## B. Payment & session

- [ ] Unpaid paid-route → 402 with Base USDC requirements  
- [ ] Valid payment → 200 + receipt `settled` + session header/body  
- [ ] Replay → `payment_replay`  
- [ ] Underpay → `payment_insufficient`  
- [ ] Free Memory GET without session → `session_required`  
- [ ] Free Memory GET with session → 200, no charge  
- [ ] Session expired → `session_expired`  

## C. Budget & credits

- [ ] Default daily cap $2 enforced (`budget_exceeded`)  
- [ ] Kill switch daily=0 blocks paid work  
- [ ] Forced failure after settle → receipt `credited` + credit_minor increases  
- [ ] Next paid call applies credit  
- [ ] Receipts export lists routes/amounts/status  

## D. Memory

- [ ] PUT/GET round trip; default TTL ~7d  
- [ ] Oversize → `payload_too_large`  
- [ ] Cross-wallet isolation  

## E. Artifacts

- [ ] Upload with max_bytes → public URL on `artifacts.agentkeep.app`  
- [ ] Bytes match sha256; GET URL unpaid  
- [ ] Blocked content-type rejected  
- [ ] Over declared size rejected  

## F. Notify & owner

- [ ] Unbound notify → `channel_not_bound`  
- [ ] Bind email (magic link) works  
- [ ] Bind Telegram deep link works  
- [ ] Create ticket → pending → human approve → approved  
- [ ] Timeout terminal  
- [ ] `callback_url` to private IP → `ssrf_blocked`  
- [ ] Caps update requires OTP  

## G. Inbox

- [ ] First GET provisions `{hash}@inbox.agentkeep.app`  
- [ ] Inbound email appears in poll  
- [ ] Ack marks read  
- [ ] Cross-wallet isolation  
- [ ] Attachment stripped  

## H. Fetch & trust

- [ ] Fixture URL → markdown; flat price  
- [ ] SSRF 127.0.0.1 / metadata blocked  
- [ ] Trust probe sets `looks_x402` correctly on fixture  
- [ ] Trust SSRF blocked  

## I. Rate limits

- [ ] Memory GET >60/min → `rate_limited`  
- [ ] Notify >10/hour → `rate_limited`  

## J. Agent-only doc test

- [ ] Fresh agent uses only llms+skill+OpenAPI for memory+fetch+notify happy path  

## K. Ops

- [ ] Pause switch → `payment_unavailable`  

## Sign-off

| Role | Name | Date |
|------|------|------|
| Product | | |
| Eng | | |
| Ops | | |
