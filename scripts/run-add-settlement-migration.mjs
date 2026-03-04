/**
 * 執行「結算設定」migration。
 * 新增 shops.settlementType、settlementDates、settlementAnchorDate、settlementCycleDays。
 *
 * 使用方式：
 *   node scripts/run-add-settlement-migration.mjs
 */

import "dotenv/config";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

const statements = [
  `ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settlementType" varchar(32)`,
  `ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settlementDates" varchar(64)`,
  `ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settlementAnchorDate" date`,
  `ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settlementCycleDays" integer`,
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
    console.log("Migration add-settlement completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
