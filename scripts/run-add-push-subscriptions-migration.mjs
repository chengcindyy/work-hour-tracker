#!/usr/bin/env node
/**
 * 執行 pushSubscriptions 表遷移
 * 適用於：資料庫已存在，只需新增 pushSubscriptions 表
 * 執行：pnpm run db:migrate-add-push-subscriptions
 */
import "dotenv/config";
import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const dbUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

  const sqlPath = join(__dirname, "../drizzle/0007_add_push_subscriptions.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(sql);
    console.log("pushSubscriptions 表遷移完成");
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log("pushSubscriptions 表已存在，跳過");
    } else {
      console.error("遷移失敗:", err);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main();
