import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../../src/store/memory-store.js";
import { chargeWallet, creditWallet } from "../../src/services/budget.js";
import { AppError } from "../../src/errors.js";

describe("budget / hard cap", () => {
  it("charges and enforces hard daily cap with no side effects on exceed", async () => {
    const store = createMemoryStore(5_000);
    await chargeWallet(store, "algo:A", 3_000);
    const w1 = await store.getWallet("algo:A");
    expect(w1?.spentTodayMinor).toBe(3_000);

    await expect(chargeWallet(store, "algo:A", 3_000)).rejects.toBeInstanceOf(AppError);
    const w2 = await store.getWallet("algo:A");
    expect(w2?.spentTodayMinor).toBe(3_000);
  });

  it("applies credit before spend", async () => {
    const store = createMemoryStore(10_000);
    await store.upsertWallet({
      walletId: "algo:B",
      dailyCapMinor: 10_000,
      spentTodayMinor: 0,
      creditMinor: 4_000,
      spendDay: new Date().toISOString().slice(0, 10),
    });
    const r = await chargeWallet(store, "algo:B", 5_000);
    expect(r.creditAppliedMinor).toBe(4_000);
    expect(r.chargedMinor).toBe(1_000);
    const w = await store.getWallet("algo:B");
    expect(w?.creditMinor).toBe(0);
    expect(w?.spentTodayMinor).toBe(1_000);
  });

  it("serializes parallel charges under lock", async () => {
    const store = createMemoryStore(10_000);
    const results = await Promise.allSettled([
      chargeWallet(store, "algo:C", 6_000),
      chargeWallet(store, "algo:C", 6_000),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const bad = results.filter((r) => r.status === "rejected");
    expect(ok.length).toBe(1);
    expect(bad.length).toBe(1);
    const w = await store.getWallet("algo:C");
    expect(w?.spentTodayMinor).toBe(6_000);
  });

  it("credit reverses spent_today on post-pay failure offset", async () => {
    const store = createMemoryStore(50_000);
    await chargeWallet(store, "algo:D", 10_000);
    await creditWallet(store, "algo:D", 10_000);
    const w = await store.getWallet("algo:D");
    expect(w?.spentTodayMinor).toBe(0);
    expect(w?.creditMinor).toBe(10_000);
  });
});
