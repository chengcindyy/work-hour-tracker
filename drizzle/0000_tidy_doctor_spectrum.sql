CREATE TABLE "notificationSettings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" serial NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"reminderTime" varchar(5) NOT NULL,
	"reminderDays" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notificationSettings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "serviceTypes" (
	"id" serial PRIMARY KEY NOT NULL,
	"shopId" serial NOT NULL,
	"name" varchar(255) NOT NULL,
	"hourlyPay" numeric(10, 2) NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" serial NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "workRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" serial NOT NULL,
	"shopId" serial NOT NULL,
	"serviceTypeId" serial NOT NULL,
	"workDate" date NOT NULL,
	"hours" numeric(10, 2) NOT NULL,
	"tips" numeric(10, 2) DEFAULT '0' NOT NULL,
	"hourlyPay" numeric(10, 2) NOT NULL,
	"totalEarnings" numeric(10, 2) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
