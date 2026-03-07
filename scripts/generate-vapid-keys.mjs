#!/usr/bin/env node
/**
 * 產生 Web Push 用的 VAPID 金鑰
 * 執行：node scripts/generate-vapid-keys.mjs
 * 將輸出加入 .env：
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 */
import webPush from "web-push";

const { publicKey, privateKey } = webPush.generateVAPIDKeys();
console.log("將以下內容加入 .env：\n");
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
