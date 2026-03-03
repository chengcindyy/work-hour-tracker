-- 1. 建立工時紀錄明細表
CREATE TABLE IF NOT EXISTS "workRecordLineItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"workRecordId" integer NOT NULL,
	"serviceTypeId" integer NOT NULL,
	"hours" numeric(10, 2) NOT NULL,
	"hourlyPay" numeric(10, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workRecordLineItems" ADD CONSTRAINT "workRecordLineItems_workRecordId_workRecords_id_fk" FOREIGN KEY ("workRecordId") REFERENCES "public"."workRecords"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workRecordLineItems" ADD CONSTRAINT "workRecordLineItems_serviceTypeId_serviceTypes_id_fk" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."serviceTypes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- 2. 將 workRecords 的 serviceTypeId、hours、hourlyPay 改為可選（時薪制改用 line items）
ALTER TABLE "workRecords" ALTER COLUMN "serviceTypeId" DROP NOT NULL;