import webPush from "web-push";
import { ENV } from "./env";
import { getPushSubscriptionsByUserId } from "../db";

const TITLE = "工時登記系統";
const BODY = "別忘了登記今天的工時喔！";

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
  const body = payload.body ?? BODY;
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
