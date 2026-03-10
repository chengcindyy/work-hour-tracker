import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { ENV } from "./env";

export async function ensureDevUser(): Promise<void> {
  if (ENV.isProduction) return;
  if (ENV.disableDevFallback) return;

  const db = await getDb();
  if (!db) return;

  const [existing] = await db.select().from(users).where(eq(users.id, 1)).limit(1);
  const [existingByOpenId] = await db
    .select()
    .from(users)
    .where(eq(users.openId, "dev-local-user"))
    .limit(1);
  if (existing || existingByOpenId) return;

  await db.insert(users).values({
    openId: "dev-local-user",
    name: "Dev User",
    email: "dev@local.test",
    loginMethod: "dev",
    role: "user",
  });
}
