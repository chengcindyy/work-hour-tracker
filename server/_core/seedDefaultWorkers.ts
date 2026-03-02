import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { users, workRecords, workers } from "../../drizzle/schema";

/**
 * 一次性／啟動時遷移：
 * - 為尚未有任何 worker 的既有使用者建立一個預設 worker
 * - 將該使用者所有既有的 workRecords 掛到這個預設 worker 上
 *
 * 設計為冪等：若使用者已經有 worker，或 workRecords 已有 workerId，則不會重複處理。
 */
export async function ensureDefaultWorkersForExistingUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Workers] Database not available, skipping default workers migration");
    return;
  }

  try {
    const allUsers = await db.select().from(users);

    for (const user of allUsers) {
      // 若該 user 已經有任何 worker，就略過
      const existingWorkers = await db
        .select()
        .from(workers)
        .where(eq(workers.ownerUserId, user.id));

      if (existingWorkers.length > 0) {
        continue;
      }

      // 找出這個 user 名下尚未指定 workerId 的工時紀錄
      const recordsWithoutWorker = await db
        .select()
        .from(workRecords)
        .where(and(eq(workRecords.userId, user.id)));

      // 若完全沒有工時紀錄，也仍然可以選擇建立一個預設 worker，讓 UI 預設可選
      const defaultWorkerName = user.name || "自己";

      const createdWorkers = await db
        .insert(workers)
        .values({
          ownerUserId: user.id,
          name: defaultWorkerName,
        })
        .returning();

      const created = createdWorkers[0];
      if (!created) {
        console.warn("[Workers] Failed to create default worker for user", user.id);
        continue;
      }

      // 將既有工時紀錄掛到預設 worker 上
      if (recordsWithoutWorker.length > 0) {
        await db
          .update(workRecords)
          .set({ workerId: created.id })
          .where(eq(workRecords.userId, user.id));
      }
    }
  } catch (error) {
    console.error("[Workers] Failed to ensure default workers:", error);
  }
}

