import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPgPool, createNeonStore } from "../../src/store/neon-store.js";
import { migrateStore } from "../../src/store/migrate.js";
import { chargeWallet } from "../../src/services/budget.js";

function loadDatabaseUrl(): string | undefined {
  try {
    const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
    for (const line of env.split("\n")) {
      if (!line.startsWith("DATABASE_URL=")) continue;
      let v = line.slice("DATABASE_URL=".length).trim();
      const hash = v.search(/\s+#/);
      if (hash >= 0) v = v.slice(0, hash).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return v || undefined;
    }
  } catch {
    /* no .env */
  }
  return process.env.DATABASE_URL || undefined;
}

const databaseUrl = loadDatabaseUrl();

describe.runIf(Boolean(databaseUrl))("neon store integration", () => {
  it("migrates, stores memory, charges under lock", async () => {
    const pool = createPgPool(databaseUrl!);
    await migrateStore(pool);
    const store = createNeonStore(pool, 50_000);
    const walletId = `algo:TEST_NEON_${Date.now()}`;

    await store.putMemory({
      walletId,
      key: "hello",
      value: JSON.stringify({ ok: true }),
      contentType: "application/json",
      expiresAt: Date.now() + 60_000,
      updatedAt: new Date().toISOString(),
    });
    const got = await store.getMemory(walletId, "hello");
    expect(got?.value).toContain("ok");

    const charge = await chargeWallet(store, walletId, 1000);
    expect(charge.chargedMinor).toBe(1000);
    const w = await store.getWallet(walletId);
    expect(w?.spentTodayMinor).toBe(1000);

    const nonce = `n_${Date.now()}`;
    expect(await store.seenNonce(nonce)).toBe(false);
    await store.markNonce(nonce);
    expect(await store.seenNonce(nonce)).toBe(true);

    await pool.end();
  }, 60_000);
});
