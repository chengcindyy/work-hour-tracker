CREATE TABLE "pushSubscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workRecordLineItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"workRecordId" integer NOT NULL,
	"serviceTypeId" integer NOT NULL,
	"hours" numeric(10, 2) NOT NULL,
	"hourlyPay" numeric(10, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workRecords" ALTER COLUMN "serviceTypeId" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "workRecords" ALTER COLUMN "serviceTypeId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "settlementType" varchar(32);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "settlementDates" varchar(64);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "settlementAnchorDate" date;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "settlementCycleDays" integer;--> statement-breakpoint
ALTER TABLE "pushSubscriptions" ADD CONSTRAINT "pushSubscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workRecordLineItems" ADD CONSTRAINT "workRecordLineItems_workRecordId_workRecords_id_fk" FOREIGN KEY ("workRecordId") REFERENCES "public"."workRecords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workRecordLineItems" ADD CONSTRAINT "workRecordLineItems_serviceTypeId_serviceTypes_id_fk" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."serviceTypes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workRecords" ADD CONSTRAINT "workRecords_serviceTypeId_serviceTypes_id_fk" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."serviceTypes"("id") ON DELETE no action ON UPDATE no action;