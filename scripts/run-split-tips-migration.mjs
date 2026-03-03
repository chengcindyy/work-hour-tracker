/**
 * 執行「小費拆分為現金與刷卡」migration。
 * 新增 workRecords.cashTips、workRecords.cardTips，
 * 將既有 tips 複製到 cashTips，並移除 tips 欄位。
 *
 * 使用方式：
 *   node scripts/run-split-tips-migration.mjs
 */

import "dotenv/config";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

const statements = [
  `ALTER TABLE "workRecords" ADD COLUMN IF NOT EXISTS "cashTips" numeric(10, 2) DEFAULT 0 NOT NULL`,
  `ALTER TABLE "workRecords" ADD COLUMN IF NOT EXISTS "cardTips" numeric(10, 2) DEFAULT 0 NOT NULL`,
  `UPDATE "workRecords" SET "cashTips" = COALESCE("tips", 0)`,
  `ALTER TABLE "workRecords" DROP COLUMN IF EXISTS "tips"`,
];

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      console.log(`[${i + 1}/${statements.length}] Running: ${stmt.substring(0, 60)}...`);
      await client.query(stmt);
    }
    console.log("Migration split-tips completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
