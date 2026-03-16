import webPush from "web-push";
import { ENV } from "./env";
import { getPushSubscriptionsByUserId } from "../db";

const TITLE = "工時登記系統";

/** 工時提醒推播訊息，每天輪流顯示。若要新增：在此陣列加入新字串即可。 */
const REMINDER_MESSAGES = [
  "叮咚！下班時間到 🎉 犒賞自己之前，別忘了花 10 秒填個工時喔！",
  "呼～終於忙完了！趁記憶猶新，快來把今天的努力記錄下來吧 📝",
  "快樂下班去！🏃‍♂️ 走之前動動手指登記工時，讓今天完美收尾！",
  "打卡鐘響了！工時登記一下，安心享受你的自由時光吧 🍻",
];

export function isPushConfigured(): boolean {
  return !!(ENV.vapidPublicKey && ENV.vapidPrivateKey);
}

export async function sendPushToUser(
  userId: number,
  payload: { title?: string; body?: string; tag?: string } = {}
): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured()) {
    console.warn("[Push] VAPID keys not configured, skipping");
    return { sent: 0, failed: 0 };
  }

  webPush.setVapidDetails(
    "mailto:support@example.com",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );

  const subscriptions = await getPushSubscriptionsByUserId(userId);
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const title = payload.title ?? TITLE;
  const body =
    payload.body ??
    REMINDER_MESSAGES[
      Math.floor(Date.now() / 86400000) % REMINDER_MESSAGES.length
    ];
  const tag = payload.tag ?? "work-hour-reminder";

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify({ title, body, tag }),
        {
          TTL: 60 * 60 * 24,
        }
      );
      sent++;
    } catch (err) {
      console.warn("[Push] Failed to send to user", userId, err);
      failed++;
    }
  }

  return { sent, failed };
}
