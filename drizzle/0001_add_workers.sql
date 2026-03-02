-- 1. 建立 workers 表
CREATE TABLE "workers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- 2. 先以可為 NULL 新增 workerId，避免既有工時資料導致錯誤
ALTER TABLE "workRecords" ADD COLUMN "workerId" integer NULL;
--> statement-breakpoint
-- 3. workers 外鍵
ALTER TABLE "workers" ADD CONSTRAINT "workers_ownerUserId_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- 4. 為每個 user 建立一個預設成員
INSERT INTO "workers" ("ownerUserId", "name")
SELECT id, COALESCE(name, '自己') FROM "users";
--> statement-breakpoint
-- 5. 將既有工時紀錄掛到該 user 的預設成員
UPDATE "workRecords" SET "workerId" = (
	SELECT w.id FROM "workers" w
	WHERE w."ownerUserId" = "workRecords"."userId"
	LIMIT 1
);
--> statement-breakpoint
-- 6. 設為必填並加上外鍵
ALTER TABLE "workRecords" ALTER COLUMN "workerId" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "workRecords" ADD CONSTRAINT "workRecords_workerId_workers_id_fk" FOREIGN KEY ("workerId") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;
