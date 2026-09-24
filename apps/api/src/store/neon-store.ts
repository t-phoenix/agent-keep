import pg, { type Pool, type PoolClient } from "pg";
import type {
  ArtifactMeta,
  InboxMessage,
  LedgerEntry,
  MemoryRow,
  NotifyTicket,
  Store,
  WalletRow,
} from "./memory-store.js";

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function mapWallet(r: Record<string, unknown>): WalletRow {
  return {
    walletId: String(r.wallet_id),
    dailyCapMinor: Number(r.daily_cap_minor),
    spentTodayMinor: Number(r.spent_today_minor),
    creditMinor: Number(r.credit_minor),
    spendDay: String(r.spend_day),
    ownerSince: r.owner_since ? new Date(String(r.owner_since)).toISOString() : undefined,
    emailBound: Boolean(r.email_bound),
    telegramBound: Boolean(r.telegram_bound),
    ownerEmail: r.owner_email ? String(r.owner_email) : null,
  };
}

function mapLedger(r: Record<string, unknown>): LedgerEntry {
  return {
    receiptId: String(r.receipt_id),
    walletId: String(r.wallet_id),
    route: String(r.route),
    amountMinor: Number(r.amount_minor),
    network: String(r.network),
    status: r.status as LedgerEntry["status"],
    requestId: String(r.request_id),
    createdAt: new Date(String(r.created_at)).toISOString(),
    idempotencyKey: r.idempotency_key ? String(r.idempotency_key) : undefined,
  };
}

export function createPgPool(databaseUrl: string): Pool {
  return new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ssl: databaseUrl.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
  });
}

export function createNeonStore(pool: Pool, defaultDailyCapMinor: number): Store {
  async function ensureWallet(client: PoolClient, walletId: string): Promise<WalletRow> {
    const day = utcDay();
    const existing = await client.query(`SELECT * FROM wallets WHERE wallet_id = $1 FOR UPDATE`, [
      walletId,
    ]);
    if (existing.rowCount === 0) {
      const row: WalletRow = {
        walletId,
        dailyCapMinor: defaultDailyCapMinor,
        spentTodayMinor: 0,
        creditMinor: 0,
        spendDay: day,
      };
      await client.query(
        `INSERT INTO wallets (wallet_id, daily_cap_minor, spent_today_minor, credit_minor, spend_day)
         VALUES ($1,$2,$3,$4,$5)`,
        [row.walletId, row.dailyCapMinor, row.spentTodayMinor, row.creditMinor, row.spendDay],
      );
      return row;
    }
    let w = mapWallet(existing.rows[0]!);
    if (w.spendDay !== day) {
      w = { ...w, spendDay: day, spentTodayMinor: 0 };
      await client.query(
        `UPDATE wallets SET spend_day = $2, spent_today_minor = 0, updated_at = NOW() WHERE wallet_id = $1`,
        [walletId, day],
      );
    }
    return w;
  }

  return {
    async getWallet(walletId) {
      const r = await pool.query(`SELECT * FROM wallets WHERE wallet_id = $1`, [walletId]);
      return r.rowCount ? mapWallet(r.rows[0]!) : null;
    },

    async upsertWallet(row) {
      await pool.query(
        `INSERT INTO wallets (
           wallet_id, daily_cap_minor, spent_today_minor, credit_minor, spend_day,
           owner_since, email_bound, telegram_bound, owner_email, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (wallet_id) DO UPDATE SET
           daily_cap_minor = EXCLUDED.daily_cap_minor,
           spent_today_minor = EXCLUDED.spent_today_minor,
           credit_minor = EXCLUDED.credit_minor,
           spend_day = EXCLUDED.spend_day,
           owner_since = EXCLUDED.owner_since,
           email_bound = EXCLUDED.email_bound,
           telegram_bound = EXCLUDED.telegram_bound,
           owner_email = EXCLUDED.owner_email,
           updated_at = NOW()`,
        [
          row.walletId,
          row.dailyCapMinor,
          row.spentTodayMinor,
          row.creditMinor,
          row.spendDay,
          row.ownerSince ?? null,
          row.emailBound ?? false,
          row.telegramBound ?? false,
          row.ownerEmail ?? null,
        ],
      );
    },

    async withWalletLock(walletId, fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const w = await ensureWallet(client, walletId);
        const result = await fn(w);
        await client.query(
          `UPDATE wallets SET
             daily_cap_minor = $2,
             spent_today_minor = $3,
             credit_minor = $4,
             spend_day = $5,
             owner_since = $6,
             email_bound = $7,
             telegram_bound = $8,
             owner_email = $9,
             updated_at = NOW()
           WHERE wallet_id = $1`,
          [
            w.walletId,
            w.dailyCapMinor,
            w.spentTodayMinor,
            w.creditMinor,
            w.spendDay,
            w.ownerSince ?? null,
            w.emailBound ?? false,
            w.telegramBound ?? false,
            w.ownerEmail ?? null,
          ],
        );
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async putMemory(row) {
      await pool.query(
        `INSERT INTO memory_kv (wallet_id, key, value, content_type, expires_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (wallet_id, key) DO UPDATE SET
           value = EXCLUDED.value,
           content_type = EXCLUDED.content_type,
           expires_at = EXCLUDED.expires_at,
           updated_at = EXCLUDED.updated_at`,
        [
          row.walletId,
          row.key,
          row.value,
          row.contentType,
          row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
          row.updatedAt,
        ],
      );
    },

    async getMemory(walletId, key) {
      const r = await pool.query(`SELECT * FROM memory_kv WHERE wallet_id = $1 AND key = $2`, [
        walletId,
        key,
      ]);
      if (!r.rowCount) return null;
      const row = r.rows[0]!;
      const expiresAt = row.expires_at ? new Date(String(row.expires_at)).getTime() : null;
      if (expiresAt && expiresAt < Date.now()) {
        await pool.query(`DELETE FROM memory_kv WHERE wallet_id = $1 AND key = $2`, [walletId, key]);
        return null;
      }
      return {
        walletId: String(row.wallet_id),
        key: String(row.key),
        value: String(row.value),
        contentType: String(row.content_type),
        expiresAt,
        updatedAt: new Date(String(row.updated_at)).toISOString(),
      } satisfies MemoryRow;
    },

    async deleteMemory(walletId, key) {
      const r = await pool.query(`DELETE FROM memory_kv WHERE wallet_id = $1 AND key = $2`, [
        walletId,
        key,
      ]);
      return (r.rowCount ?? 0) > 0;
    },

    async listMemoryKeys(walletId) {
      const r = await pool.query(
        `SELECT key, updated_at, expires_at FROM memory_kv WHERE wallet_id = $1 ORDER BY updated_at DESC`,
        [walletId],
      );
      const now = Date.now();
      return r.rows
        .map((row) => {
          const expiresAt = row.expires_at ? new Date(String(row.expires_at)).getTime() : null;
          return {
            key: String(row.key),
            updatedAt: new Date(String(row.updated_at)).toISOString(),
            expiresAt,
            _expired: expiresAt !== null && expiresAt < now,
          };
        })
        .filter((x) => !x._expired)
        .map(({ key, updatedAt, expiresAt }) => ({ key, updatedAt, expiresAt }));
    },

    async addLedger(entry) {
      await pool.query(
        `INSERT INTO ledger (
           receipt_id, wallet_id, route, amount_minor, network, status, request_id, created_at, idempotency_key
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (receipt_id) DO NOTHING`,
        [
          entry.receiptId,
          entry.walletId,
          entry.route,
          entry.amountMinor,
          entry.network,
          entry.status,
          entry.requestId,
          entry.createdAt,
          entry.idempotencyKey ?? null,
        ],
      );
    },

    async listLedger(walletId, limit) {
      const r = await pool.query(
        `SELECT * FROM ledger WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [walletId, limit],
      );
      return r.rows.map((row) => mapLedger(row));
    },

    async findLedgerByIdempotency(walletId, key) {
      const r = await pool.query(
        `SELECT * FROM ledger WHERE wallet_id = $1 AND idempotency_key = $2 LIMIT 1`,
        [walletId, key],
      );
      return r.rowCount ? mapLedger(r.rows[0]!) : null;
    },

    async putNotify(t: NotifyTicket) {
      await pool.query(
        `INSERT INTO notify_tickets (id, wallet_id, status, question, answer, created_at, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           answer = EXCLUDED.answer,
           expires_at = EXCLUDED.expires_at`,
        [t.id, t.walletId, t.status, t.question, t.answer ?? null, t.createdAt, t.expiresAt],
      );
    },

    async getNotify(walletId, id) {
      const r = await pool.query(`SELECT * FROM notify_tickets WHERE id = $1 AND wallet_id = $2`, [
        id,
        walletId,
      ]);
      if (!r.rowCount) return null;
      const row = r.rows[0]!;
      return {
        id: String(row.id),
        walletId: String(row.wallet_id),
        status: row.status as NotifyTicket["status"],
        question: String(row.question),
        answer: row.answer ? String(row.answer) : undefined,
        createdAt: new Date(String(row.created_at)).toISOString(),
        expiresAt: new Date(String(row.expires_at)).toISOString(),
      };
    },

    async listInbox(walletId) {
      const r = await pool.query(
        `SELECT * FROM inbox_messages WHERE wallet_id = $1 ORDER BY created_at DESC`,
        [walletId],
      );
      return r.rows.map((row) => ({
        id: String(row.id),
        walletId: String(row.wallet_id),
        body: String(row.body),
        createdAt: new Date(String(row.created_at)).toISOString(),
        acked: Boolean(row.acked),
      }));
    },

    async ackInbox(walletId, id) {
      const r = await pool.query(
        `UPDATE inbox_messages SET acked = TRUE WHERE id = $1 AND wallet_id = $2`,
        [id, walletId],
      );
      return (r.rowCount ?? 0) > 0;
    },

    async addInbox(msg) {
      await pool.query(
        `INSERT INTO inbox_messages (id, wallet_id, body, created_at, acked)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [msg.id, msg.walletId, msg.body, msg.createdAt, msg.acked],
      );
    },

    async putArtifact(a: ArtifactMeta) {
      await pool.query(
        `INSERT INTO artifacts (id, wallet_id, url, sha256, content_type, bytes, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.walletId, a.url, a.sha256, a.contentType, a.bytes, a.createdAt],
      );
    },

    async getArtifact(walletId, id) {
      const r = await pool.query(`SELECT * FROM artifacts WHERE id = $1 AND wallet_id = $2`, [
        id,
        walletId,
      ]);
      if (!r.rowCount) return null;
      const row = r.rows[0]!;
      return {
        id: String(row.id),
        walletId: String(row.wallet_id),
        url: String(row.url),
        sha256: String(row.sha256),
        contentType: String(row.content_type),
        bytes: Number(row.bytes),
        createdAt: new Date(String(row.created_at)).toISOString(),
      };
    },

    async getArtifactById(id) {
      const r = await pool.query(`SELECT * FROM artifacts WHERE id = $1`, [id]);
      if (!r.rowCount) return null;
      const row = r.rows[0]!;
      return {
        id: String(row.id),
        walletId: String(row.wallet_id),
        url: String(row.url),
        sha256: String(row.sha256),
        contentType: String(row.content_type),
        bytes: Number(row.bytes),
        createdAt: new Date(String(row.created_at)).toISOString(),
      };
    },

    async seenNonce(nonce) {
      const r = await pool.query(`SELECT 1 FROM payment_nonces WHERE nonce = $1`, [nonce]);
      return (r.rowCount ?? 0) > 0;
    },

    async markNonce(nonce) {
      await pool.query(`INSERT INTO payment_nonces (nonce) VALUES ($1) ON CONFLICT DO NOTHING`, [
        nonce,
      ]);
    },
  };
}
