/**
 * 執行「工時紀錄多項目」migration。
 * 1. 建立 workRecordLineItems 表
 * 2. 將 workRecords.serviceTypeId 改為可選
 * 3. 將既有時薪制紀錄遷移為 line items
 *
 * 使用方式：
 *   node scripts/run-add-line-items-migration.mjs
 */

import "dotenv/config";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

const statements = [
  `CREATE TABLE IF NOT EXISTS "workRecordLineItems" (
    "id" serial PRIMARY KEY NOT NULL,
    "workRecordId" integer NOT NULL,
    "serviceTypeId" integer NOT NULL,
    "hours" numeric(10, 2) NOT NULL,
    "hourlyPay" numeric(10, 2) NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  )`,
  `ALTER TABLE "workRecordLineItems" DROP CONSTRAINT IF EXISTS "workRecordLineItems_workRecordId_workRecords_id_fk"`,
  `ALTER TABLE "workRecordLineItems" ADD CONSTRAINT "workRecordLineItems_workRecordId_workRecords_id_fk" FOREIGN KEY ("workRecordId") REFERENCES "public"."workRecords"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "workRecordLineItems" DROP CONSTRAINT IF EXISTS "workRecordLineItems_serviceTypeId_serviceTypes_id_fk"`,
  `ALTER TABLE "workRecordLineItems" ADD CONSTRAINT "workRecordLineItems_serviceTypeId_serviceTypes_id_fk" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."serviceTypes"("id") ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE "workRecords" ALTER COLUMN "serviceTypeId" DROP NOT NULL`,
  // 資料遷移：既有時薪制紀錄（serviceTypeId、hours、hourlyPay 有值且非抽成制）建立對應 line item
  `INSERT INTO "workRecordLineItems" ("workRecordId", "serviceTypeId", "hours", "hourlyPay", "createdAt", "updatedAt")
   SELECT wr.id, wr."serviceTypeId", wr.hours, wr."hourlyPay", wr."createdAt", wr."updatedAt"
   FROM "workRecords" wr
   WHERE wr."serviceTypeId" IS NOT NULL
     AND wr.hours IS NOT NULL
     AND wr."hourlyPay" IS NOT NULL
     AND (wr."serviceAmount" IS NULL OR wr."serviceAmount" = 0)
     AND NOT EXISTS (SELECT 1 FROM "workRecordLineItems" li WHERE li."workRecordId" = wr.id)`,
];

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      console.log(`[${i + 1}/${statements.length}] Running: ${stmt.substring(0, 80)}...`);
      await client.query(stmt);
    }
    console.log("Migration add-line-items completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
