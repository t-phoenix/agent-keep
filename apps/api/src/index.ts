import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { createMemoryStore } from "./store/memory-store.js";
import { createNeonStore, createPgPool } from "./store/neon-store.js";
import { migrateStore } from "./store/migrate.js";

async function main() {
  const config = loadConfig();
  let store = createMemoryStore(config.defaultDailyCapMinor);
  let storeKind: "memory" | "neon" = "memory";

  if (config.databaseUrl) {
    const pool = createPgPool(config.databaseUrl);
    await migrateStore(pool);
    store = createNeonStore(pool, config.defaultDailyCapMinor);
    storeKind = "neon";
  }

  const { app } = createApp({ config, store });
  serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, (info) => {
    console.log(`AgentKeep API listening on http://0.0.0.0:${info.port}`);
    console.log(
      `payment adapter=${config.payment.adapter} mode=${config.payment.mode} store=${storeKind}`,
    );
  });
}

main().catch((err) => {
  console.error("fatal_startup", err instanceof Error ? err.message : err);
  process.exit(1);
});
