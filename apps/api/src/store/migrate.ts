import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function migrateStore(pool: Pool): Promise<void> {
  const sql = readFileSync(resolve(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
}
