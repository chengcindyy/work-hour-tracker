-- 1. shops: 新增計薪方式與抽成比例
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "payType" varchar(32) DEFAULT 'hourly' NOT NULL;
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "shopCommissionRate" numeric(5, 4);
--> statement-breakpoint
-- 2. workRecords: 時數與時薪改為可選（抽成制不需要）
ALTER TABLE "workRecords" ALTER COLUMN "hours" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "workRecords" ALTER COLUMN "hourlyPay" DROP NOT NULL;
--> statement-breakpoint
-- 3. workRecords: 新增抽成制欄位
ALTER TABLE "workRecords" ADD COLUMN IF NOT EXISTS "serviceAmount" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "workRecords" ADD COLUMN IF NOT EXISTS "shopCommissionAmount" numeric(10, 2);
