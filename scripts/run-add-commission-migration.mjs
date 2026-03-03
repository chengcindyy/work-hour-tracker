/**
 * 執行「抽成制計薪」migration。
 * 新增 shops.payType、shops.shopCommissionRate、
 * workRecords.serviceAmount、workRecords.shopCommissionAmount，
 * 並將 hours、hourlyPay 改為可選。
 *
 * 使用方式：
 *   node scripts/run-add-commission-migration.mjs
 */

import "dotenv/config";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

const statements = [
  `ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "payType" varchar(32) DEFAULT 'hourly' NOT NULL`,
  `ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "shopCommissionRate" numeric(5, 4)`,
  `ALTER TABLE "workRecords" ALTER COLUMN "hours" DROP NOT NULL`,
  `ALTER TABLE "workRecords" ALTER COLUMN "hourlyPay" DROP NOT NULL`,
  `ALTER TABLE "workRecords" ADD COLUMN IF NOT EXISTS "serviceAmount" numeric(10, 2)`,
  `ALTER TABLE "workRecords" ADD COLUMN IF NOT EXISTS "shopCommissionAmount" numeric(10, 2)`,
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
    console.log("Migration add-commission completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
