import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createPgPool } from "../src/store/neon-store.js";
import { migrateStore } from "../src/store/migrate.js";

function loadEnv() {
  for (const p of [resolve("../../.env"), resolve(".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      if (!line.includes("=") || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i);
      let v = line.slice(i + 1).trim();
      const h = v.search(/\s+#/);
      if (h >= 0) v = v.slice(0, h).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}
const pool = createPgPool(url);
await migrateStore(pool);
console.log("Neon schema migrated");
await pool.end();
