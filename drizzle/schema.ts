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
 * 店家表：存儲用戶的多家店舖信息
 */
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  userId: serial("userId").notNull(), // 外鍵，關聯到 users 表
  name: varchar("name", { length: 255 }).notNull(), // 店家名稱
  description: text("description"), // 店家描述
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
  serviceTypeId: serial("serviceTypeId").notNull(), // 外鍵，關聯到 serviceTypes 表
  workDate: date("workDate").notNull(), // 工作日期
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull(), // 工作時數
  tips: numeric("tips", { precision: 10, scale: 2 }).default("0").notNull(), // 小費
  hourlyPay: numeric("hourlyPay", { precision: 10, scale: 2 }).notNull(), // 記錄當時的時薪（防止時薪變更影響歷史記錄）
  totalEarnings: numeric("totalEarnings", { precision: 10, scale: 2 }).notNull(), // 總收入 = hours * hourlyPay + tips
  notes: text("notes"), // 備註
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WorkRecord = typeof workRecords.$inferSelect;
export type InsertWorkRecord = typeof workRecords.$inferInsert;

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
