import { getUsersToNotifyForReminder } from "../db";
import { sendPushToUser } from "./pushService";

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startPushReminderScheduler(): void {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay();

    try {
      const userIds = await getUsersToNotifyForReminder(hour, minute, dayOfWeek);
      for (const userId of userIds) {
        await sendPushToUser(userId);
      }
    } catch (err) {
      console.warn("[PushScheduler] Error:", err);
    }
  }, 60 * 1000);

  console.log("[PushScheduler] Started (checks every minute)");
}

export function stopPushReminderScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[PushScheduler] Stopped");
  }
}
