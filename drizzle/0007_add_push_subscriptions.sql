CREATE TABLE IF NOT EXISTS "pushSubscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
