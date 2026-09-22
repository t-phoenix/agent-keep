# 11 — Security & threat model

## Assets

1. Wallet funds (indirect — we can cause wasteful spend)  
2. Memory contents (secrets agents foolishly store)  
3. Artifacts (private docs, generated keys — treat as sensitive)  
4. Inbox contents (confirmations, PII)  
5. Owner notify channel (phishing surface)  
6. Ledger integrity (trust with owners)  
7. Origin reputation on scanners  

## Adversaries

| Adversary | Goal |
|-----------|------|
| Abusive agent | Free compute, SSRF into cloud metadata, malware hosting |
| Cross-wallet attacker | Read another wallet’s memory/inbox |
| Payment attacker | Replay proofs, underpay, race budget |
| Owner phisher | Fake notify prompts |
| Scanner poisoner | Impersonate our origin |

## STRIDE-style highlights

### Spoofing

- Payment proof must bind to route + amount + nonce  
- Owner bind must be stepped-up (see payments doc)

### Tampering

- Ledger append-only  
- Artifact bytes immutable by hash  

### Repudiation

- Receipts for both sides  
- Retain payment_ref  

### Information disclosure

- Strict wallet isolation tests  
- No directory listing of artifacts  
- Redact secrets in logs (payment headers, memory values)

### Denial of service

- Rate limits  
- Fetch timeouts / max bytes  
- Notify rate limits to protect humans  
- Upload size caps  

### Elevation of privilege

- Cap changes only via owner auth  
- Admin ops not on public agent API  

## SSRF policy (`/fetch`, `/trust`, `callback_url`)

Locked in `21`:

1. HTTPS only  
2. Resolve DNS → check **final IPs** against deny list  
3. Deny: private IPv4/IPv6, link-local, loopback, cloud metadata  
4. **No redirects** preferred; if follow, max 2 hops and re-validate each  
5. Timeout 3s; deny callbacks to `*.agentkeep.app`  
6. One callback POST per ticket  

## Malware / abuse on artifacts

- Allowlist: image/*, application/json, text/*, application/pdf  
- Block: html, javascript, wasm, executables, archives  
- Non-images: `Content-Disposition: attachment`  
- 50 uploads / wallet / day  
- Abuse takedown &lt;24h (hash block)  
- AV scan → v1.1 if needed  

## Secrets in memory

Agents will store API keys in KV despite warnings.

Mitigations:

- Docs warn “don’t store long-lived secrets”  
- Encryption at rest  
- TTL defaults  
- No memory value in server logs  

## Payment races

- Idempotency keys  
- Single-use nonces  
- Budget check close to settlement  

## Security acceptance tests (must pass before public money)

- [ ] Wallet A cannot GET Wallet B memory/inbox/artifacts metadata  
- [ ] SSRF suite green  
- [ ] Payment replay rejected  
- [ ] Oversize upload rejected  
- [ ] Rate limit returns typed error  
- [ ] Notify cannot target arbitrary third-party phone/email without bind  

## Disclosure

Create `security@` later; until then document contact in README when live.
