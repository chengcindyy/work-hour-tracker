-- 1. 先新增可為 NULL 的 workerId 欄位，避免既有資料違反 NOT NULL 限制
ALTER TABLE "serviceTypes" ADD COLUMN "workerId" integer NULL;
--> statement-breakpoint
-- 2. 為既有的服務類型填入對應成員：
--    根據 serviceTypes.shopId -> shops.userId -> workers.ownerUserId，選擇該使用者的一個成員
UPDATE "serviceTypes" st
SET "workerId" = w.id
FROM "shops" s
JOIN "workers" w
  ON w."ownerUserId" = s."userId"
WHERE st."shopId" = s."id"
  AND st."workerId" IS NULL;
--> statement-breakpoint
-- 3. 將欄位改為 NOT NULL 並加上外鍵約束
ALTER TABLE "serviceTypes" ALTER COLUMN "workerId" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "serviceTypes" ADD CONSTRAINT "serviceTypes_workerId_workers_id_fk" FOREIGN KEY ("workerId") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;