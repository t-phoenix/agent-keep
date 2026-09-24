-- AgentKeep core tables (Neon Postgres)
-- Applied by apps/api/src/store/migrate.ts

CREATE TABLE IF NOT EXISTS wallets (
  wallet_id TEXT PRIMARY KEY,
  daily_cap_minor BIGINT NOT NULL,
  spent_today_minor BIGINT NOT NULL DEFAULT 0,
  credit_minor BIGINT NOT NULL DEFAULT 0,
  spend_day TEXT NOT NULL,
  owner_since TIMESTAMPTZ,
  email_bound BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_bound BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_kv (
  wallet_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/json',
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (wallet_id, key)
);

CREATE INDEX IF NOT EXISTS memory_kv_wallet_idx ON memory_kv (wallet_id);

CREATE TABLE IF NOT EXISTS ledger (
  receipt_id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  route TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  network TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('settled', 'credited', 'failed')),
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT
);

CREATE INDEX IF NOT EXISTS ledger_wallet_created_idx ON ledger (wallet_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_wallet_idempotency_uidx
  ON ledger (wallet_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS notify_tickets (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  status TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS notify_wallet_idx ON notify_tickets (wallet_id);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  acked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS inbox_wallet_idx ON inbox_messages (wallet_id);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  url TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  content_type TEXT NOT NULL,
  bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS artifacts_wallet_idx ON artifacts (wallet_id);

CREATE TABLE IF NOT EXISTS payment_nonces (
  nonce TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive migrations (safe to re-run)
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS owner_email TEXT;
