# 04 — Personas & jobs-to-be-done

## Persona A — Autonomous wallet agent (“Runner”)

**Who:** LLM agent with a hot wallet, running tasks for a human or another agent.  
**Context:** Discovers APIs via OpenAPI / llms.txt / MPPScan. Pays per call. Hates API keys.

### Jobs

| Job | Success looks like |
|-----|-------------------|
| Remember facts across tool calls | `PUT` then later `GET` same key works hours later |
| Hand a file to another tool/agent | Artifact URL opens; hash matches |
| Ask owner before irreversible action | Notify returns approve/deny before spend |
| Wait for external confirmation | Inbox shows reply/webhook payload |
| Stay under owner’s risk tolerance | Cap hit → clear error, no silent partial work |
| Read a URL without inventing scrape code | `/fetch` returns clean markdown |

### Friction they feel today

- Session memory dies  
- Generated images/files disappear  
- No standard “ask human” HTTP  
- Blind payment to unknown 402 endpoints  
- Subscription walls on every utility  

### Design implications

- Perfect OpenAPI descriptions  
- Deterministic errors  
- Tiny payloads; no HTML responses on API host  
- Prices in discovery files  

---

## Persona B — Human owner (“Principal”)

**Who:** Funds the agent wallet; liable for spend and public actions.  
**Context:** May never open a fancy dashboard if Telegram/email works.

### Jobs

| Job | Success looks like |
|-----|-------------------|
| Bound downside | Daily/task caps enforced |
| Audit what was bought | Exportable receipts |
| Approve high-risk steps | Notify on preferred channel |
| Kill / pause | Cap to zero or revoke binding |
| Trust isolation | Their agent’s memory isn’t public |

### Design implications

- Budget + notify are first-class, not afterthoughts  
- Plain-language receipt fields  
- Minimal owner onboarding (bind channel once)  

---

## Persona C — Framework / skill author (“Integrator”)

**Who:** Builds Cursor skills, LangGraph tools, custom agent runtimes.  
**Context:** Wants one dependency that covers continuity.

### Jobs

| Job | Success looks like |
|-----|-------------------|
| Wrap AgentKeep as tools | OpenAPI → generated client works |
| Document for other agents | skill.md copy-paste accurate |
| Avoid key distribution | Payment headers only |

### Design implications

- Stable `/v1`  
- Semver + changelog for breaking changes  
- Examples in skill.md that run as-is  

---

## Persona D — Operator (you)

**Who:** Runs AgentKeep origin; watches abuse and COGS.  
**Jobs:** Uptime, fraud, margin, scanner reputation.

### Design implications

- Per-route metrics  
- SSRF and upload malware policy  
- Clear refund/dispute stance in ops doc  

---

## Job stories (format)

1. When I finish a research subtask, I want to **store the conclusion under a key**, so the next tool doesn’t re-scrape.  
2. When I generate an image, I want a **durable URL**, so I can email or tip another agent with the link.  
3. When I’m about to buy a gift card, I want to **ask my owner**, so I don’t drain the wallet.  
4. When a merchant emails a confirmation, I want it in **my inbox**, so I can continue the workflow.  
5. When my owner asks “what did you spend?”, I want **receipts JSON**, so trust survives.  
6. When I only have a URL, I want **markdown**, so I can reason without a browser stack.
