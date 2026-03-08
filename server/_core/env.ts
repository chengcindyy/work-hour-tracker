export const ENV = {
  appId: process.env.VITE_APP_ID ?? "work-hour-tracker",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** 設為 true 時停用 dev 自動登入，方便測試 OAuth */
  disableDevFallback: process.env.DISABLE_DEV_FALLBACK === "true",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  /** VAPID 公鑰，用於前端 PushManager.subscribe */
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  /** VAPID 私鑰，用於後端 web-push 發送 */
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
};
