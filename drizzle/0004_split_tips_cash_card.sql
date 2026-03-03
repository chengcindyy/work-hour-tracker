-- 1. 新增現金小費、刷卡小費欄位
ALTER TABLE "workRecords" ADD COLUMN IF NOT EXISTS "cashTips" numeric(10, 2) DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "workRecords" ADD COLUMN IF NOT EXISTS "cardTips" numeric(10, 2) DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- 2. 將既有 tips 複製到 cashTips
UPDATE "workRecords" SET "cashTips" = COALESCE("tips", 0);
--> statement-breakpoint
-- 3. 移除 tips 欄位
ALTER TABLE "workRecords" DROP COLUMN IF EXISTS "tips";
