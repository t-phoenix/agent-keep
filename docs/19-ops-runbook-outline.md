# 19 — Ops runbook outline

Fill before mainnet money. Sections only for now.

## 1. Service map

- API URL  
- Artifact CDN URL  
- Admin access path  
- Provider dashboards (email, TG, host, DB, facilitator)

## 2. Oncall

- Who  
- Severity definitions (SEV1 payment down, SEV2 fetch degraded, …)  
- Comms channel  

## 3. Incidents

- Payment verify failures  
- Ledger write failures (paid but not receipted)  
- Data isolation suspicion (SEV1)  
- Abuse spike / malware artifact  
- Provider outage (email)

## 4. Remediation playbooks (stubs)

- Pause paid routes / return `payment_unavailable`  
- Force-expire abusive wallet (`suspended`)  
- Refund policy steps  
- Rotate payTo address  

## 5. Deploy

- Staging → canary → prod  
- OpenAPI diff gate (prices/paths)  
- Discovery file deploy atomic with API  

## 6. Backups

- DB PITR  
- Ledger export nightly  
- Artifact durability class  

## 7. Cost alarms

- Egress  
- Fetch concurrency  
- Notify volume  

## 8. Status communication

- How agents learn of downtime (status URL in llms.txt)
