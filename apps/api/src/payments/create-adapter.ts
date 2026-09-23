import type { AppConfig } from "../config.js";
import { createMockPaymentAdapter, type PaymentAdapter } from "./adapter.js";
import { createLivePaymentAdapter } from "./live-adapter.js";

export function createPaymentAdapter(config: AppConfig): PaymentAdapter {
  if (config.payment.adapter === "live") {
    return createLivePaymentAdapter(config);
  }
  return createMockPaymentAdapter(config);
}
