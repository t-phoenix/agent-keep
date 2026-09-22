# 12 — Privacy, compliance, retention

## Principles

1. Minimize PII — agents and owners only  
2. Wallet address is pseudonymous identity; inbox/notify may introduce real PII  
3. Retention defaults are short except ledger  
4. Export + delete paths for owner trust  

## Data classes

| Class | Examples | Handling |
|-------|----------|----------|
| Public | Artifact bytes if public-URL policy | Assume crawlable |
| Tenant-private | Memory, inbox, tickets | Encrypted at rest; wallet-scoped |
| Owner PII | Email, Telegram id | Encrypted; access-controlled |
| Financial | Ledger, payment refs | Retain longer; restrict access |
| Logs | Request metadata | No bodies/values by default |

## Retention (confirmed 2026-09-05)

- Memory **30d**  
- Artifacts **90d**  
- Inbox **30d**  
- Tickets **90d**  
- Ledger **24m+**  

## Owner rights (product, not legal advice)

| Right | Mechanism |
|-------|-----------|
| Export | Receipts + memory list + inbox export endpoint (owner auth) |
| Delete | Delete wallet data job (except legally required ledger minimum) |
| Channel unbind | Owner auth |

## Inbound email / messages

- Spam filtering  
- Do not parse unnecessary headers into agent responses  
- Attachment policy explicit  
- DMARC/SPF for sending if we send notify mail  

## Cross-border / processors

Document subprocessors when chosen: host, DB, object store, email/Telegram, payment facilitator.

## Warnings to agents (put in skill.md)

- Do not store passwords, seed phrases, or card numbers in `/memory` or `/artifacts`  
- Treat artifact URLs as public unless we ship auth downloads  
- Notify questions may be seen by the human on an insecure channel  

## Compliance posture (v1 honesty)

We are a micropay infra API.  
v1 is **not** claiming HIPAA/SOC2.  
If enterprise appears, revisit — don’t fake badges.

## Design-for constraints (from open questions)

See full ideation in [20-open-questions.md](20-open-questions.md) §19. Short list:

1. Pay-per-call settle — avoid custodial user balances  
2. Email/Telegram = PII → encrypt, retain short, export/delete  
3. Anti-spam on notify; owner unbind  
4. Public artifacts → abuse/takedown path  
5. SSRF hardening on `/fetch` + `callback_url`  
6. Default low mainnet daily caps  
7. Clear ToS: API access, not money transmission for third parties  
8. No AgentCash brand entanglement (separate privacy policy / entity as needed)
