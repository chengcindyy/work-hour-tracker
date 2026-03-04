-- shops: 新增結算設定欄位
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settlementType" varchar(32);
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settlementDates" varchar(64);
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settlementAnchorDate" date;
--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settlementCycleDays" integer;
