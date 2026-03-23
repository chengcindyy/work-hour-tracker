import {
  serial,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
  date,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 成員／工作者表：一個登入使用者底下可以有多個成員
 */
export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("ownerUserId")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(), // 成員名稱（例如：自己、先生）
  isActive: boolean("isActive").default(true).notNull(), // 是否啟用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = typeof workers.$inferInsert;

/**
 * 店家表：存儲用戶的多家店舖信息（依成員區分，每位成員有自己的店家清單）
 */
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  userId: serial("userId").notNull(), // 外鍵，關聯到 users 表（帳號擁有者）
  workerId: integer("workerId")
    .notNull()
    .references(() => workers.id), // 外鍵，關聯到 workers 表（此店家屬於哪一位成員）
  name: varchar("name", { length: 255 }).notNull(), // 店家名稱
  description: text("description"), // 店家描述
  payType: varchar("payType", { length: 32 }).notNull().default("hourly"), // 計薪方式：hourly | commission
  shopCommissionRate: numeric("shopCommissionRate", { precision: 5, scale: 4 }), // 店家抽成比例 0~1，僅抽成制使用
  settlementType: varchar("settlementType", { length: 32 }), // "fixed_dates" | "month_end" | "cycle" | null
  settlementDates: varchar("settlementDates", { length: 64 }), // JSON 陣列，如 "[8,23]"
  settlementAnchorDate: date("settlementAnchorDate"), // 週期制錨點日
  settlementCycleDays: integer("settlementCycleDays"), // 週期天數，如 14
  isActive: boolean("isActive").default(true).notNull(), // 是否啟用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Shop = typeof shops.$inferSelect;
export type InsertShop = typeof shops.$inferInsert;

/**
 * 服務類型表：每家店可以有多種服務類型，每種有不同的時薪
 */
export const serviceTypes = pgTable("serviceTypes", {
  id: serial("id").primaryKey(),
  shopId: serial("shopId").notNull(), // 外鍵，關聯到 shops 表
  workerId: integer("workerId")
    .notNull()
    .references(() => workers.id), // 外鍵，關聯到 workers 表（成員）
  name: varchar("name", { length: 255 }).notNull(), // 服務類型名稱（如：做腳、做身體）
  hourlyPay: numeric("hourlyPay", { precision: 10, scale: 2 }).notNull(), // 時薪
  description: text("description"), // 服務描述
  isActive: boolean("isActive").default(true).notNull(), // 是否啟用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ServiceType = typeof serviceTypes.$inferSelect;
export type InsertServiceType = typeof serviceTypes.$inferInsert;

/**
 * 工時紀錄表：記錄每次工作的詳細信息
 */
export const workRecords = pgTable("workRecords", {
  id: serial("id").primaryKey(),
  userId: serial("userId").notNull(), // 外鍵，關聯到 users 表（資料擁有者）
  workerId: integer("workerId")
    .notNull()
    .references(() => workers.id), // 外鍵，關聯到 workers 表（實際工作者）
  shopId: serial("shopId").notNull(), // 外鍵，關聯到 shops 表
  serviceTypeId: integer("serviceTypeId").references(() => serviceTypes.id), // 抽成制或舊資料使用；時薪制改用 line items
  workDate: date("workDate").notNull(), // 工作日期
  hours: numeric("hours", { precision: 10, scale: 2 }), // 抽成制或舊資料；時薪制改用 line items
  cashTips: numeric("cashTips", { precision: 10, scale: 2 }).default("0").notNull(), // 現金小費
  cardTips: numeric("cardTips", { precision: 10, scale: 2 }).default("0").notNull(), // 刷卡小費
  hourlyPay: numeric("hourlyPay", { precision: 10, scale: 2 }), // 抽成制或舊資料；時薪制改用 line items
  serviceAmount: numeric("serviceAmount", { precision: 10, scale: 2 }), // 服務總金額（抽成制使用）
  shopCommissionAmount: numeric("shopCommissionAmount", { precision: 10, scale: 2 }), // 店家抽成金額（抽成制使用）
  totalEarnings: numeric("totalEarnings", { precision: 10, scale: 2 }).notNull(), // 總收入
  notes: text("notes"), // 備註
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WorkRecord = typeof workRecords.$inferSelect;
export type InsertWorkRecord = typeof workRecords.$inferInsert;

/**
 * 工時紀錄明細表：時薪制可有多個服務項目（各項目不同時薪與時數）
 */
export const workRecordLineItems = pgTable("workRecordLineItems", {
  id: serial("id").primaryKey(),
  workRecordId: integer("workRecordId")
    .notNull()
    .references(() => workRecords.id, { onDelete: "cascade" }),
  serviceTypeId: integer("serviceTypeId")
    .notNull()
    .references(() => serviceTypes.id),
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull(),
  hourlyPay: numeric("hourlyPay", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WorkRecordLineItem = typeof workRecordLineItems.$inferSelect;
export type InsertWorkRecordLineItem = typeof workRecordLineItems.$inferInsert;

/**
 * 推播通知設定表：存儲用戶的推播提醒設定
 */
export const notificationSettings = pgTable("notificationSettings", {
  id: serial("id").primaryKey(),
  userId: serial("userId").notNull().unique(), // 外鍵，關聯到 users 表
  isEnabled: boolean("isEnabled").default(true).notNull(), // 是否啟用推播
  reminderTime: varchar("reminderTime", { length: 5 }).notNull(), // 提醒時間（HH:mm 格式）
  reminderDays: varchar("reminderDays", { length: 255 }).notNull(), // 提醒日期（JSON 格式：[0,1,2,3,4,5,6] 表示周日到周六）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = typeof notificationSettings.$inferInsert;

/**
 * Web Push 訂閱表：儲存使用者的推播訂閱（每台裝置一個）
 */
export const pushSubscriptions = pgTable("pushSubscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * 帳號層級 UI 偏好：介面語言與金額顯示幣別（多裝置同步）
 */
export const userPreferences = pgTable("userPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  uiLocale: varchar("uiLocale", { length: 16 }).notNull().default("zh-TW"),
  currencyCode: varchar("currencyCode", { length: 8 }).notNull().default("CAD"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserPreferenceRow = typeof userPreferences.$inferSelect;
export type InsertUserPreferenceRow = typeof userPreferences.$inferInsert;
