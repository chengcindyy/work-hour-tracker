/**
 * 單獨執行「shops 表新增 workerId」migration。
 * 為既有店家指派所屬成員：每個 user 的店家都掛到該 user 的第一個 worker。
 *
 * 使用方式（在專案根目錄）：
 *   DATABASE_URL="postgresql://..." node scripts/run-add-shops-worker-migration.mjs
 * 或先設定好 .env 的 DATABASE_URL 後：
 *   node scripts/run-add-shops-worker-migration.mjs
 */

import "dotenv/config";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

const statements = [
  `ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "workerId" integer NULL;`,
  `UPDATE "shops" s
   SET "workerId" = (
     SELECT w.id FROM "workers" w
     WHERE w."ownerUserId" = s."userId"
     ORDER BY w.id LIMIT 1
   )
   WHERE s."workerId" IS NULL;`,
  `UPDATE "shops" s
   SET "workerId" = (SELECT w2.id FROM "workers" w2 ORDER BY w2.id LIMIT 1)
   WHERE s."workerId" IS NULL;`,
  `ALTER TABLE "shops" ALTER COLUMN "workerId" SET NOT NULL;`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'shops_workerId_workers_id_fk'
     ) THEN
       ALTER TABLE "shops"
         ADD CONSTRAINT "shops_workerId_workers_id_fk"
         FOREIGN KEY ("workerId") REFERENCES "public"."workers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
     END IF;
   END $$;`,
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
    console.log("Migration add-shops-worker completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
