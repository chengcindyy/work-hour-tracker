import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { 
  InsertUser, 
  users, 
  shops, 
  serviceTypes, 
  workRecords,
  notificationSettings,
  type Shop,
  type ServiceType,
  type WorkRecord,
  type NotificationSetting,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

function formatDateForDb(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL: Use ON CONFLICT for upsert
    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ 店家相關查詢 ============

export async function getUserShops(userId: number): Promise<Shop[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(shops).where(eq(shops.userId, userId));
}

export async function getShopById(shopId: number, userId: number): Promise<Shop | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(shops)
    .where(and(eq(shops.id, shopId), eq(shops.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createShop(userId: number, name: string, description?: string): Promise<Shop> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .insert(shops)
    .values({
      userId,
      name,
      description,
    })
    .returning();
  
  if (!result[0]) throw new Error("Failed to create shop");
  
  return result[0];
}

export async function updateShop(shopId: number, userId: number, updates: { name?: string; description?: string; isActive?: boolean }): Promise<Shop> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .update(shops)
    .set(updates)
    .where(and(eq(shops.id, shopId), eq(shops.userId, userId)))
    .returning();
  
  if (!result[0]) throw new Error("Failed to update shop");
  
  return result[0];
}

export async function deleteShop(shopId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(shops)
    .where(and(eq(shops.id, shopId), eq(shops.userId, userId)));
}

// ============ 服務類型相關查詢 ============

export async function getShopServiceTypes(shopId: number): Promise<ServiceType[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(serviceTypes).where(eq(serviceTypes.shopId, shopId));
}

export async function getServiceTypeById(serviceTypeId: number): Promise<ServiceType | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(serviceTypes)
    .where(eq(serviceTypes.id, serviceTypeId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createServiceType(shopId: number, name: string, hourlyPay: number, description?: string): Promise<ServiceType> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .insert(serviceTypes)
    .values({
      shopId,
      name,
      hourlyPay: hourlyPay.toString(),
      description,
    })
    .returning();
  
  if (!result[0]) throw new Error("Failed to create service type");
  
  return result[0];
}

export async function updateServiceType(serviceTypeId: number, updates: { name?: string; hourlyPay?: number; description?: string; isActive?: boolean }): Promise<ServiceType> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...updates };
  if (updates.hourlyPay !== undefined) {
    updateData.hourlyPay = updates.hourlyPay.toString();
  }
  
  const result = await db
    .update(serviceTypes)
    .set(updateData)
    .where(eq(serviceTypes.id, serviceTypeId))
    .returning();
  
  if (!result[0]) throw new Error("Failed to update service type");
  
  return result[0];
}

export async function deleteServiceType(serviceTypeId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(serviceTypes).where(eq(serviceTypes.id, serviceTypeId));
}

// ============ 工時紀錄相關查詢 ============

export async function getUserWorkRecords(userId: number, startDate?: Date, endDate?: Date): Promise<WorkRecord[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [eq(workRecords.userId, userId)];
  
  if (startDate) {
    conditions.push(gte(workRecords.workDate, formatDateForDb(startDate)));
  }
  if (endDate) {
    conditions.push(lte(workRecords.workDate, formatDateForDb(endDate)));
  }
  
  return db
    .select()
    .from(workRecords)
    .where(and(...conditions))
    .orderBy(desc(workRecords.workDate));
}

export async function getWorkRecordById(recordId: number, userId: number): Promise<WorkRecord | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(workRecords)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createWorkRecord(
  userId: number,
  shopId: number,
  serviceTypeId: number,
  workDate: Date,
  hours: number,
  tips: number,
  hourlyPay: number,
  notes?: string
): Promise<WorkRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const totalEarnings = hours * hourlyPay + tips;
  
  const result = await db
    .insert(workRecords)
    .values({
      userId,
      shopId,
      serviceTypeId,
      workDate: formatDateForDb(workDate),
      hours: hours.toString(),
      tips: tips.toString(),
      hourlyPay: hourlyPay.toString(),
      totalEarnings: totalEarnings.toString(),
      notes,
    })
    .returning();
  
  if (!result[0]) throw new Error("Failed to create work record");
  
  return result[0];
}

export async function updateWorkRecord(
  recordId: number,
  userId: number,
  updates: {
    shopId?: number;
    serviceTypeId?: number;
    workDate?: Date;
    hours?: number;
    tips?: number;
    hourlyPay?: number;
    notes?: string;
  }
): Promise<WorkRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...updates };
  
  if (updates.workDate !== undefined) {
    updateData.workDate = formatDateForDb(updates.workDate);
  }
  
  if (updates.hours !== undefined || updates.tips !== undefined || updates.hourlyPay !== undefined) {
    const record = await getWorkRecordById(recordId, userId);
    if (!record) throw new Error("Work record not found");
    
    const hours = updates.hours ?? parseFloat(record.hours as any);
    const tips = updates.tips ?? parseFloat(record.tips as any);
    const hourlyPay = updates.hourlyPay ?? parseFloat(record.hourlyPay as any);
    
    updateData.totalEarnings = (hours * hourlyPay + tips).toString();
    
    if (updates.hours !== undefined) updateData.hours = updates.hours.toString();
    if (updates.tips !== undefined) updateData.tips = updates.tips.toString();
    if (updates.hourlyPay !== undefined) updateData.hourlyPay = updates.hourlyPay.toString();
  }
  
  const result = await db
    .update(workRecords)
    .set(updateData)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
    .returning();
  
  if (!result[0]) throw new Error("Failed to update work record");
  
  return result[0];
}

export async function deleteWorkRecord(recordId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(workRecords)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)));
}

// ============ 統計相關查詢 ============

export async function getMonthlyStats(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const records = await getUserWorkRecords(userId, startDate, endDate);
  
  const stats = {
    totalHours: 0,
    totalEarnings: 0,
    totalTips: 0,
    byShop: {} as Record<number, { shopName: string; hours: number; earnings: number; tips: number }>,
  };
  
  for (const record of records) {
    const hours = parseFloat(record.hours as any);
    const earnings = parseFloat(record.totalEarnings as any);
    const tips = parseFloat(record.tips as any);
    
    stats.totalHours += hours;
    stats.totalEarnings += earnings;
    stats.totalTips += tips;
    
    if (!stats.byShop[record.shopId]) {
      const shop = await getShopById(record.shopId, userId);
      stats.byShop[record.shopId] = {
        shopName: shop?.name || "Unknown",
        hours: 0,
        earnings: 0,
        tips: 0,
      };
    }
    
    stats.byShop[record.shopId].hours += hours;
    stats.byShop[record.shopId].earnings += earnings;
    stats.byShop[record.shopId].tips += tips;
  }
  
  return stats;
}

// ============ 推播通知設定相關查詢 ============

export async function getNotificationSettings(userId: number): Promise<NotificationSetting | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertNotificationSettings(
  userId: number,
  isEnabled: boolean,
  reminderTime: string,
  reminderDays: number[]
): Promise<NotificationSetting> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getNotificationSettings(userId);
  
  if (existing) {
    const result = await db
      .update(notificationSettings)
      .set({
        isEnabled,
        reminderTime,
        reminderDays: JSON.stringify(reminderDays),
      })
      .where(eq(notificationSettings.userId, userId))
      .returning();
    
    if (!result[0]) throw new Error("Failed to update notification settings");
    return result[0];
  } else {
    const result = await db
      .insert(notificationSettings)
      .values({
        userId,
        isEnabled,
        reminderTime,
        reminderDays: JSON.stringify(reminderDays),
      })
      .returning();
    
    if (!result[0]) throw new Error("Failed to create notification settings");
    return result[0];
  }
}
