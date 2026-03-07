#!/usr/bin/env node
/**
 * 以程式執行 Drizzle 資料庫遷移（用於 Docker 啟動前）
 * 使用：DATABASE_URL=... node scripts/migrate.mjs
 */
import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[Migrate] DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

try {
  await migrate(db, {
    migrationsFolder: path.join(projectRoot, "drizzle"),
  });
  console.log("[Migrate] Migrations completed");
} catch (err) {
  console.error("[Migrate] Failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
