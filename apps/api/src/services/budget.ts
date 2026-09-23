import type { Store, WalletRow } from "../store/memory-store.js";
import { AppError } from "../errors.js";

export type ChargeResult = {
  chargedMinor: number;
  creditAppliedMinor: number;
  remainingTodayMinor: number;
};

/**
 * Apply credit first, then check hard daily cap, then record spend.
 * Must run inside withWalletLock.
 */
export async function chargeWallet(
  store: Store,
  walletId: string,
  priceMinor: number,
): Promise<ChargeResult> {
  return store.withWalletLock(walletId, async (w: WalletRow) => {
    let creditApplied = 0;
    let due = priceMinor;
    if (w.creditMinor > 0) {
      creditApplied = Math.min(w.creditMinor, due);
      due -= creditApplied;
      w.creditMinor -= creditApplied;
    }
    if (w.spentTodayMinor + due > w.dailyCapMinor) {
      throw new AppError("budget_exceeded", "Daily cap reached", {
        spent_today_minor: w.spentTodayMinor,
        daily_cap_minor: w.dailyCapMinor,
        due_minor: due,
      });
    }
    w.spentTodayMinor += due;
    if (!w.ownerSince) w.ownerSince = new Date().toISOString();
    // Persistence is owned by withWalletLock implementations (in-memory mutates by ref; Neon writes on commit).
    return {
      chargedMinor: due,
      creditAppliedMinor: creditApplied,
      remainingTodayMinor: w.dailyCapMinor - w.spentTodayMinor,
    };
  });
}

/** Post-pay failure: restore spend and add credit offset. */
export async function creditWallet(store: Store, walletId: string, amountMinor: number): Promise<void> {
  await store.withWalletLock(walletId, async (w: WalletRow) => {
    w.creditMinor += amountMinor;
    w.spentTodayMinor = Math.max(0, w.spentTodayMinor - amountMinor);
  });
}
