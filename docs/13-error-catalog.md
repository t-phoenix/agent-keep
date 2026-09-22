# 13 — Error catalog

Agents branch on `code`, not `message`.

```json
{
  "error": {
    "code": "budget_exceeded",
    "message": "Daily cap reached",
    "request_id": "…",
    "details": {}
  }
}
```

## Codes

| code | HTTP | Meaning | Agent action |
|------|------|---------|--------------|
| `payment_required` | 402 | Need payment | Complete x402; retry |
| `payment_invalid` | 402/401 | Proof failed | Re-pay |
| `payment_insufficient` | 402 | Underpaid | Pay correct amount |
| `payment_replay` | 409 | Nonce reused | New challenge |
| `payment_unavailable` | 503 | Rail/pause | Backoff |
| `session_required` | 401 | Free route needs session/proof | Pay any route or re-auth |
| `session_expired` | 401 | Session TTL elapsed | Re-auth |
| `budget_exceeded` | 403 | Hard cap hit | Notify owner / stop |
| `rate_limited` | 429 | Too many calls | Honor Retry-After |
| `unauthorized` | 401 | Owner route auth missing | Owner flow |
| `forbidden` | 403 | Denied | Stop |
| `channel_not_bound` | 409 | Notify with no email/TG | Owner must bind |
| `otp_required` | 401 | Caps/delete need OTP | Complete OTP |
| `otp_invalid` | 401 | Bad OTP | Retry |
| `not_found` | 404 | Missing | Handle miss |
| `conflict` | 409 | State conflict | GET then decide |
| `validation_error` | 400 | Bad schema | Fix request |
| `payload_too_large` | 413 | Over size | Shrink |
| `unsupported_media_type` | 415 | Bad type | Fix |
| `ssrf_blocked` | 400 | URL denied | Don’t retry |
| `upstream_timeout` | 504 | Target slow | Backoff/skip |
| `upstream_error` | 502 | Target failed | See details |
| `notify_timeout` | 200* | Ticket timed out | Abort (*body status) |
| `inbox_full` | 429 | Ingest/quota | Ack old |
| `storage_unavailable` | 503 | Blob/KV down | Backoff |
| `internal_error` | 500 | Bug | Limited retry |

## Receipt statuses (not always errors)

- `settled` — work OK, charged  
- `credited` — paid but work failed; spend offset issued  
- `failed` — verify/settle did not complete  

## Terminal notify statuses

`approved` | `denied` | `answered` | `timeout` | `cancelled`

## Compatibility

Never reuse a `code` for a different meaning. Deprecate via changelog ≥ 6 months.
