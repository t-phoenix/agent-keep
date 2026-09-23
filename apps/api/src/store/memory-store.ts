export type LedgerStatus = "settled" | "credited" | "failed";

export type LedgerEntry = {
  receiptId: string;
  walletId: string;
  route: string;
  amountMinor: number;
  network: string;
  status: LedgerStatus;
  requestId: string;
  createdAt: string;
  idempotencyKey?: string;
};

export type WalletRow = {
  walletId: string;
  dailyCapMinor: number;
  spentTodayMinor: number;
  creditMinor: number;
  spendDay: string; // YYYY-MM-DD UTC
  ownerSince?: string;
  emailBound?: boolean;
  telegramBound?: boolean;
};

export type MemoryRow = {
  walletId: string;
  key: string;
  value: string;
  contentType: string;
  expiresAt: number | null;
  updatedAt: string;
};

export type NotifyTicket = {
  id: string;
  walletId: string;
  status: "pending" | "approved" | "denied" | "answered" | "timeout" | "cancelled";
  question: string;
  answer?: string;
  createdAt: string;
  expiresAt: string;
};

export type InboxMessage = {
  id: string;
  walletId: string;
  body: string;
  createdAt: string;
  acked: boolean;
};

export type ArtifactMeta = {
  id: string;
  walletId: string;
  url: string;
  sha256: string;
  contentType: string;
  bytes: number;
  createdAt: string;
};

export interface Store {
  getWallet(walletId: string): Promise<WalletRow | null>;
  upsertWallet(row: WalletRow): Promise<void>;
  withWalletLock<T>(walletId: string, fn: (w: WalletRow) => Promise<T>): Promise<T>;

  putMemory(row: MemoryRow): Promise<void>;
  getMemory(walletId: string, key: string): Promise<MemoryRow | null>;
  deleteMemory(walletId: string, key: string): Promise<boolean>;
  listMemoryKeys(walletId: string): Promise<Array<{ key: string; updatedAt: string; expiresAt: number | null }>>;

  addLedger(entry: LedgerEntry): Promise<void>;
  listLedger(walletId: string, limit: number): Promise<LedgerEntry[]>;
  findLedgerByIdempotency(walletId: string, key: string): Promise<LedgerEntry | null>;

  putNotify(t: NotifyTicket): Promise<void>;
  getNotify(walletId: string, id: string): Promise<NotifyTicket | null>;

  listInbox(walletId: string): Promise<InboxMessage[]>;
  ackInbox(walletId: string, id: string): Promise<boolean>;
  addInbox(msg: InboxMessage): Promise<void>;

  putArtifact(a: ArtifactMeta): Promise<void>;
  getArtifact(walletId: string, id: string): Promise<ArtifactMeta | null>;

  seenNonce(nonce: string): Promise<boolean>;
  markNonce(nonce: string): Promise<void>;
}

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function createMemoryStore(defaultDailyCapMinor: number): Store {
  const wallets = new Map<string, WalletRow>();
  const memory = new Map<string, MemoryRow>();
  const ledger: LedgerEntry[] = [];
  const notifies = new Map<string, NotifyTicket>();
  const inbox = new Map<string, InboxMessage[]>();
  const artifacts = new Map<string, ArtifactMeta>();
  const nonces = new Set<string>();
  const locks = new Map<string, Promise<unknown>>();

  const memKey = (w: string, k: string) => `${w}::${k}`;

  async function ensureWallet(walletId: string): Promise<WalletRow> {
    let w = wallets.get(walletId);
    const day = utcDay();
    if (!w) {
      w = {
        walletId,
        dailyCapMinor: defaultDailyCapMinor,
        spentTodayMinor: 0,
        creditMinor: 0,
        spendDay: day,
      };
      wallets.set(walletId, w);
    } else if (w.spendDay !== day) {
      w = { ...w, spendDay: day, spentTodayMinor: 0 };
      wallets.set(walletId, w);
    }
    return w;
  }

  return {
    async getWallet(walletId) {
      const w = await ensureWallet(walletId);
      return { ...w };
    },
    async upsertWallet(row) {
      wallets.set(row.walletId, { ...row });
    },
    async withWalletLock<T>(walletId: string, fn: (w: WalletRow) => Promise<T>): Promise<T> {
      const prev = locks.get(walletId) ?? Promise.resolve();
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      const run = prev.then(async () => {
        try {
          const w = await ensureWallet(walletId);
          const result = await fn(w);
          wallets.set(walletId, w);
          return result;
        } finally {
          release();
        }
      });
      locks.set(
        walletId,
        run.then(
          () => gate,
          () => gate,
        ),
      );
      return run;
    },
    async putMemory(row) {
      memory.set(memKey(row.walletId, row.key), row);
    },
    async getMemory(walletId, key) {
      const row = memory.get(memKey(walletId, key));
      if (!row) return null;
      if (row.expiresAt && row.expiresAt < Date.now()) {
        memory.delete(memKey(walletId, key));
        return null;
      }
      return row;
    },
    async deleteMemory(walletId, key) {
      return memory.delete(memKey(walletId, key));
    },
    async listMemoryKeys(walletId) {
      const out: Array<{ key: string; updatedAt: string; expiresAt: number | null }> = [];
      for (const row of memory.values()) {
        if (row.walletId !== walletId) continue;
        if (row.expiresAt && row.expiresAt < Date.now()) continue;
        out.push({ key: row.key, updatedAt: row.updatedAt, expiresAt: row.expiresAt });
      }
      return out;
    },
    async addLedger(entry) {
      ledger.push(entry);
    },
    async listLedger(walletId, limit) {
      return ledger.filter((e) => e.walletId === walletId).slice(-limit).reverse();
    },
    async findLedgerByIdempotency(walletId, key) {
      return ledger.find((e) => e.walletId === walletId && e.idempotencyKey === key) ?? null;
    },
    async putNotify(t) {
      notifies.set(`${t.walletId}::${t.id}`, t);
    },
    async getNotify(walletId, id) {
      return notifies.get(`${walletId}::${id}`) ?? null;
    },
    async listInbox(walletId) {
      return [...(inbox.get(walletId) ?? [])];
    },
    async ackInbox(walletId, id) {
      const list = inbox.get(walletId) ?? [];
      const msg = list.find((m) => m.id === id);
      if (!msg) return false;
      msg.acked = true;
      return true;
    },
    async addInbox(msg) {
      const list = inbox.get(msg.walletId) ?? [];
      list.push(msg);
      inbox.set(msg.walletId, list);
    },
    async putArtifact(a) {
      artifacts.set(`${a.walletId}::${a.id}`, a);
    },
    async getArtifact(walletId, id) {
      return artifacts.get(`${walletId}::${id}`) ?? null;
    },
    async seenNonce(nonce) {
      return nonces.has(nonce);
    },
    async markNonce(nonce) {
      nonces.add(nonce);
    },
  };
}
