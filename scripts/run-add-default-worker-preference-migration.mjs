#!/usr/bin/env node
/**
 * 執行「預設成員偏好」migration。
 * 新增 userPreferences.defaultWorkerId。
 *
 * 使用方式：
 *   node scripts/run-add-default-worker-preference-migration.mjs
 */

import "dotenv/config";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:mysecretpassword@localhost:5432/work_hour_tracker";

const statements = [
  `ALTER TABLE "userPreferences" ADD COLUMN IF NOT EXISTS "defaultWorkerId" integer`,
  `ALTER TABLE "userPreferences" DROP CONSTRAINT IF EXISTS "userPreferences_defaultWorkerId_workers_id_fk"`,
  `ALTER TABLE "userPreferences" ADD CONSTRAINT "userPreferences_defaultWorkerId_workers_id_fk" FOREIGN KEY ("defaultWorkerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
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
    console.log("Migration add-default-worker-preference completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
