/**
 * 單獨執行 0001_add_workers migration。
 * 適用於：資料庫已存在（例如用過 db:push 或手動建表），
 * 執行 pnpm exec drizzle-kit migrate 會從 0000 重跑而失敗時。
 *
 * 使用方式（在專案根目錄）：
 *   DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker" node scripts/run-add-workers-migration.mjs
 * 或先設定好 .env 的 DATABASE_URL 後：
 *   node scripts/run-add-workers-migration.mjs
 */

import "dotenv/config";
import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const migrationPath = join(projectRoot, "drizzle", "0001_add_workers.sql");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

async function run() {
  const sql = readFileSync(migrationPath, "utf-8");
  const statements = sql
    .split(/--> statement-breakpoint\n?/)
    .map((s) => s.replace(/^\s*--[^\n]*\n?/gm, "").trim())
    .filter((s) => s.length > 0);

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      console.log(`[${i + 1}/${statements.length}] Running statement...`);
      await client.query(stmt);
    }
    console.log("Migration 0001_add_workers completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
