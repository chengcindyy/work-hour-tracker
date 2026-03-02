/**
 * 單獨執行 0002_add_service_types_worker migration。
 * 適用於：資料庫已存在（例如用過 db:push 或手動建表），
 * 但尚未套用 serviceTypes 與 worker 的關聯時。
 *
 * 使用方式（在專案根目錄）：
 *   DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker" node scripts/run-add-service-types-worker-migration.mjs
 * 或先設定好 .env 的 DATABASE_URL 後：
 *   node scripts/run-add-service-types-worker-migration.mjs
 */

import "dotenv/config";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

const statements = [
  // 1. 若尚未存在，新增可為 NULL 的 workerId 欄位
  `ALTER TABLE "serviceTypes" ADD COLUMN IF NOT EXISTS "workerId" integer NULL;`,
  // 2. 依照 shop 所屬的 user，將 serviceTypes 掛到該 user 底下的某個成員
  `UPDATE "serviceTypes" st
   SET "workerId" = w.id
   FROM "shops" s
   JOIN "workers" w
     ON w."ownerUserId" = s."userId"
   WHERE st."shopId" = s."id"
     AND st."workerId" IS NULL;`,
  // 3. 對於仍然是 NULL 的情況，使用任意一個現有成員作為 fallback，避免 NOT NULL 失敗
  `UPDATE "serviceTypes" st
   SET "workerId" = (
     SELECT w2.id FROM "workers" w2 ORDER BY w2.id LIMIT 1
   )
   WHERE st."workerId" IS NULL;`,
  // 4. 將欄位改為 NOT NULL
  `ALTER TABLE "serviceTypes" ALTER COLUMN "workerId" SET NOT NULL;`,
  // 5. 加上外鍵約束（若尚未存在）
  `ALTER TABLE "serviceTypes"
   ADD CONSTRAINT "serviceTypes_workerId_workers_id_fk"
   FOREIGN KEY ("workerId") REFERENCES "public"."workers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;`,
];

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      console.log(`[${i + 1}/${statements.length}] Running statement...`);
      await client.query(stmt);
    }
    console.log("Migration 0002_add_service_types_worker completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

