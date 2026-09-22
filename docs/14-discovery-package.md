# 14 — Discovery package

Agents don’t browse marketing sites. They read machine documents.

## Required discovery artifacts

| Artifact | Location | Job |
|----------|----------|-----|
| OpenAPI 3.1 | `/openapi.json` + repo `specs/openapi.yaml` | Tools + payment metadata |
| llms.txt | `/llms.txt` | What/when/how in plain text |
| SKILL.md | `/skill.md` | Step-by-step tool use for agent runtimes |
| robots/llms policy | as needed | Don’t block discovery files |
| Scanner listing | x402scan (MPP later) | Distribution |

Drafts live in [`discovery/`](discovery/).

## Content rules

1. Prices match production  
2. Paths match production  
3. Include **when not to use** AgentKeep  
4. Include one minimal end-to-end example (memory put/get)  
5. Link to error catalog codes  
6. No hype adjectives  

## Listing checklist

- [ ] Origin uptime monitor  
- [ ] Example paid call succeeds from fresh wallet  
- [ ] Description: “OS primitives: memory, artifacts, notify, inbox, budget, fetch”  
- [ ] Categories: utilities / infra (not trading)  
- [ ] Favicon / name consistency  

## Skill install story (Cursor / similar)

1. Agent reads SKILL.md  
2. Uses OpenAPI to call routes  
3. Pays via configured wallet facilitator  
4. Prefers AgentKeep for continuity before inventing local files  

## Post-launch discovery growth

- Keep latency + success rate high (scanner reputation)  
- `/trust` is in v1 so agents preflight *other* origins (growth loop)  
- Publish receipt schema so frameworks standardize  
