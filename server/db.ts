import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser,
  users,
  shops,
  serviceTypes,
  workRecords,
  workRecordLineItems,
  notificationSettings,
  pushSubscriptions,
  userPreferences,
  workers,
  type Shop,
  type ServiceType,
  type WorkRecord,
  type WorkRecordLineItem,
  type NotificationSetting,
  type Worker,
} from "../drizzle/schema";
import {
  DEFAULT_USER_PREFERENCE_CURRENCY,
  DEFAULT_USER_PREFERENCE_UI_LOCALE,
  USER_PREFERENCE_CURRENCIES,
  USER_PREFERENCE_UI_LOCALES,
  type UserPreferenceCurrency,
  type UserPreferenceUiLocale,
} from "@shared/const";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

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

// ============ 成員／工作者相關查詢 ============

export async function getUserWorkers(userId: number): Promise<Worker[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(workers)
    .where(and(eq(workers.ownerUserId, userId), eq(workers.isActive, true)));
}

export async function createWorker(userId: number, name: string): Promise<Worker> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(workers)
    .values({
      ownerUserId: userId,
      name,
    })
    .returning();

  if (!result[0]) throw new Error("Failed to create worker");

  return result[0];
}

export async function updateWorker(
  userId: number,
  workerId: number,
  updates: { name?: string; isActive?: boolean }
): Promise<Worker> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const setValues = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  ) as { name?: string; isActive?: boolean };
  if (Object.keys(setValues).length === 0) {
    throw new Error("No valid fields to update");
  }

  const result = await db
    .update(workers)
    .set(setValues)
    .where(and(eq(workers.id, workerId), eq(workers.ownerUserId, userId)))
    .returning();

  if (!result[0]) throw new Error("Failed to update worker");

  return result[0];
}

export async function archiveWorker(userId: number, workerId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(workers)
    .set({ isActive: false })
    .where(and(eq(workers.id, workerId), eq(workers.ownerUserId, userId)));

  await db
    .update(userPreferences)
    .set({ defaultWorkerId: null, updatedAt: new Date() })
    .where(
      and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.defaultWorkerId, workerId)
      )
    );
}

export async function assertWorkerBelongsToUser(
  workerId: number,
  userId: number
): Promise<Worker> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(workers)
    .where(
      and(
        eq(workers.id, workerId),
        eq(workers.ownerUserId, userId),
        eq(workers.isActive, true)
      )
    )
    .limit(1);

  if (!result[0]) {
    throw new Error("Worker not found or does not belong to user");
  }

  return result[0];
}

// ============ 店家相關查詢 ============

export async function getUserShops(userId: number, workerId: number): Promise<Shop[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shops)
    .where(and(eq(shops.userId, userId), eq(shops.workerId, workerId)));
}

export async function getShopById(
  shopId: number,
  userId: number,
  workerId: number
): Promise<Shop | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(shops)
    .where(
      and(
        eq(shops.id, shopId),
        eq(shops.userId, userId),
        eq(shops.workerId, workerId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** 僅依 userId 查詢店家（用於工時統計等顯示店名，不區分成員） */
export async function getShopByIdForUser(shopId: number, userId: number): Promise<Shop | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(shops)
    .where(and(eq(shops.id, shopId), eq(shops.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export interface CreateShopSettlement {
  settlementType?: "fixed_dates" | "month_end" | "cycle" | null;
  settlementDates?: number[] | null;
  settlementAnchorDate?: string | null;
  settlementCycleDays?: number | null;
}

export async function createShop(
  userId: number,
  workerId: number,
  name: string,
  description?: string,
  payType: "hourly" | "commission" = "hourly",
  shopCommissionRate?: number,
  settlement?: CreateShopSettlement
): Promise<Shop> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: Record<string, unknown> = {
    userId,
    workerId,
    name,
    description,
    payType,
  };
  if (payType === "commission" && shopCommissionRate != null) {
    values.shopCommissionRate = shopCommissionRate.toString();
  }
  if (settlement) {
    if (settlement.settlementType != null) values.settlementType = settlement.settlementType;
    if (settlement.settlementDates != null)
      values.settlementDates = JSON.stringify(settlement.settlementDates);
    if (settlement.settlementAnchorDate != null)
      values.settlementAnchorDate = settlement.settlementAnchorDate;
    if (settlement.settlementCycleDays != null)
      values.settlementCycleDays = settlement.settlementCycleDays;
  }

  const result = await db
    .insert(shops)
    .values(values as any)
    .returning();

  if (!result[0]) throw new Error("Failed to create shop");

  return result[0];
}

export interface UpdateShopSettlement {
  settlementType?: "fixed_dates" | "month_end" | "cycle" | null;
  settlementDates?: number[] | null;
  settlementAnchorDate?: string | null;
  settlementCycleDays?: number | null;
}

export async function updateShop(
  shopId: number,
  userId: number,
  workerId: number,
  updates: {
    name?: string;
    description?: string;
    isActive?: boolean;
    payType?: "hourly" | "commission";
    shopCommissionRate?: number;
    settlementType?: "fixed_dates" | "month_end" | "cycle" | null;
    settlementDates?: number[] | null;
    settlementAnchorDate?: string | null;
    settlementCycleDays?: number | null;
  }
): Promise<Shop> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const setValues: Record<string, unknown> = { ...updates };
  if (updates.shopCommissionRate !== undefined) {
    setValues.shopCommissionRate = updates.shopCommissionRate.toString();
  }
  if (updates.settlementDates !== undefined) {
    setValues.settlementDates =
      updates.settlementDates == null ? null : JSON.stringify(updates.settlementDates);
  }

  const result = await db
    .update(shops)
    .set(setValues as any)
    .where(
      and(
        eq(shops.id, shopId),
        eq(shops.userId, userId),
        eq(shops.workerId, workerId)
      )
    )
    .returning();

  if (!result[0]) throw new Error("Failed to update shop");

  return result[0];
}

export async function deleteShop(
  shopId: number,
  userId: number,
  workerId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(shops)
    .where(
      and(
        eq(shops.id, shopId),
        eq(shops.userId, userId),
        eq(shops.workerId, workerId)
      )
    );
}

// ============ 服務類型相關查詢 ============

export async function getShopServiceTypes(
  shopId: number,
  workerId?: number
): Promise<ServiceType[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(serviceTypes.shopId, shopId)];
  if (workerId !== undefined) {
    conditions.push(eq(serviceTypes.workerId, workerId));
  }

  return db.select().from(serviceTypes).where(and(...conditions));
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

export async function createServiceType(
  shopId: number,
  workerId: number,
  name: string,
  hourlyPay: number,
  description?: string
): Promise<ServiceType> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .insert(serviceTypes)
    .values({
      shopId,
      workerId,
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

export type WorkRecordWithLineItems = WorkRecord & {
  lineItems?: { serviceTypeId: number; hours: number; hourlyPay: number; serviceTypeName?: string }[];
};

async function attachLineItemsToRecords(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  records: WorkRecord[]
): Promise<WorkRecordWithLineItems[]> {
  if (records.length === 0) return [];
  const ids = records.map((r) => r.id);
  const allLineItems = await db
    .select()
    .from(workRecordLineItems)
    .where(inArray(workRecordLineItems.workRecordId, ids));
  const byRecordId = new Map<number, WorkRecordLineItem[]>();
  for (const li of allLineItems) {
    const list = byRecordId.get(li.workRecordId) ?? [];
    list.push(li);
    byRecordId.set(li.workRecordId, list);
  }
  const serviceTypeIds = Array.from(new Set(allLineItems.map((li) => li.serviceTypeId)));
  const serviceTypeMap = new Map<number, string>();
  for (const stId of serviceTypeIds) {
    const st = await getServiceTypeById(stId);
    if (st) serviceTypeMap.set(stId, st.name);
  }
  return records.map((r) => {
    const items = byRecordId.get(r.id) ?? [];
    const lineItems =
      items.length > 0
        ? items.map((li) => ({
            serviceTypeId: li.serviceTypeId,
            hours: parseFloat(li.hours as any),
            hourlyPay: parseFloat(li.hourlyPay as any),
            serviceTypeName: serviceTypeMap.get(li.serviceTypeId),
          }))
        : undefined;
    return { ...r, lineItems };
  });
}

export async function getUserWorkRecords(
  userId: number,
  workerId?: number,
  startDate?: string,
  endDate?: string
): Promise<WorkRecordWithLineItems[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(workRecords.userId, userId)];

  if (workerId !== undefined) {
    conditions.push(eq(workRecords.workerId, workerId));
  }

  if (startDate) {
    conditions.push(gte(workRecords.workDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(workRecords.workDate, endDate));
  }

  const records = await db
    .select()
    .from(workRecords)
    .where(and(...conditions))
    .orderBy(desc(workRecords.workDate));

  return attachLineItemsToRecords(db, records);
}

export async function getWorkRecordById(recordId: number, userId: number): Promise<WorkRecordWithLineItems | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(workRecords)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
    .limit(1);

  if (result.length === 0) return undefined;
  const [record] = await attachLineItemsToRecords(db, result);
  return record;
}

export async function createWorkRecord(
  userId: number,
  workerId: number,
  shopId: number,
  workDate: string,
  cashTips: number,
  cardTips: number,
  notes: string | undefined,
  options:
    | { mode: "hourly"; lineItems: { serviceTypeId: number; hours: number }[] }
    | { mode: "commission"; serviceTypeId: number; serviceAmount: number; shopCommissionRate: number; hours?: number }
): Promise<WorkRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tips = cashTips + cardTips;
  let totalEarnings: number;
  const baseValues: Record<string, unknown> = {
    userId,
    workerId,
    shopId,
    workDate,
    cashTips: cashTips.toString(),
    cardTips: cardTips.toString(),
    totalEarnings: "", // set below
    notes,
  };

  if (options.mode === "hourly") {
    let hourlyTotal = 0;
    for (const item of options.lineItems) {
      const st = await getServiceTypeById(item.serviceTypeId);
      if (!st) throw new Error(`Service type ${item.serviceTypeId} not found`);
      const pay = parseFloat(st.hourlyPay as any);
      hourlyTotal += item.hours * pay;
    }
    totalEarnings = hourlyTotal + tips;
    baseValues.serviceTypeId = null;
    baseValues.hours = null;
    baseValues.hourlyPay = null;
  } else {
    const { serviceTypeId, serviceAmount, shopCommissionRate, hours } = options;
    const shopCommissionAmount = serviceAmount * shopCommissionRate;
    totalEarnings = serviceAmount * (1 - shopCommissionRate) + tips;
    baseValues.serviceTypeId = serviceTypeId;
    baseValues.serviceAmount = serviceAmount.toString();
    baseValues.shopCommissionAmount = shopCommissionAmount.toString();
    baseValues.hours = hours != null && hours >= 0 ? hours.toString() : null;
    baseValues.hourlyPay = null;
  }
  baseValues.totalEarnings = totalEarnings.toString();

  const result = await db
    .insert(workRecords)
    .values(baseValues as any)
    .returning();

  if (!result[0]) throw new Error("Failed to create work record");

  const record = result[0];

  if (options.mode === "hourly") {
    for (const item of options.lineItems) {
      const st = await getServiceTypeById(item.serviceTypeId);
      if (!st) throw new Error(`Service type ${item.serviceTypeId} not found`);
      const pay = parseFloat(st.hourlyPay as any);
      await db.insert(workRecordLineItems).values({
        workRecordId: record.id,
        serviceTypeId: item.serviceTypeId,
        hours: item.hours.toString(),
        hourlyPay: pay.toString(),
      });
    }
  }

  return record;
}

export async function updateWorkRecord(
  recordId: number,
  userId: number,
  updates: {
    shopId?: number;
    serviceTypeId?: number;
    workerId?: number;
    workDate?: string;
    hours?: number;
    cashTips?: number;
    cardTips?: number;
    hourlyPay?: number;
    serviceAmount?: number;
    shopCommissionRate?: number;
    notes?: string;
    lineItems?: { serviceTypeId: number; hours: number }[];
  }
): Promise<WorkRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const record = await getWorkRecordById(recordId, userId);
  if (!record) throw new Error("Work record not found");

  const cashTips = updates.cashTips ?? parseFloat((record as any).cashTips as any) ?? 0;
  const cardTips = updates.cardTips ?? parseFloat((record as any).cardTips as any) ?? 0;
  const tips = cashTips + cardTips;

  const updateData: any = { ...updates };
  delete updateData.lineItems;
  if (updates.workDate !== undefined) {
    updateData.workDate = updates.workDate;
  }

  const isCommissionRecord = record.serviceAmount != null && parseFloat(record.serviceAmount as any) > 0;

  // Hourly mode: lineItems provided
  if (updates.lineItems !== undefined && updates.lineItems.length > 0 && !isCommissionRecord) {
    let hourlyTotal = 0;
    for (const item of updates.lineItems) {
      const st = await getServiceTypeById(item.serviceTypeId);
      if (!st) throw new Error(`Service type ${item.serviceTypeId} not found`);
      const pay = parseFloat(st.hourlyPay as any);
      hourlyTotal += item.hours * pay;
    }
    updateData.totalEarnings = (hourlyTotal + tips).toString();
    updateData.serviceTypeId = null;
    updateData.hours = null;
    updateData.hourlyPay = null;
    updateData.serviceAmount = null;
    updateData.shopCommissionAmount = null;
    if (updates.cashTips !== undefined) updateData.cashTips = cashTips.toString();
    if (updates.cardTips !== undefined) updateData.cardTips = cardTips.toString();

    const result = await db
      .update(workRecords)
      .set(updateData)
      .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
      .returning();

    if (!result[0]) throw new Error("Failed to update work record");

    await db.delete(workRecordLineItems).where(eq(workRecordLineItems.workRecordId, recordId));
    for (const item of updates.lineItems) {
      const st = await getServiceTypeById(item.serviceTypeId);
      if (!st) throw new Error(`Service type ${item.serviceTypeId} not found`);
      const pay = parseFloat(st.hourlyPay as any);
      await db.insert(workRecordLineItems).values({
        workRecordId: recordId,
        serviceTypeId: item.serviceTypeId,
        hours: item.hours.toString(),
        hourlyPay: pay.toString(),
      });
    }
    return result[0];
  }

  // Commission mode update
  if (updates.serviceAmount !== undefined && updates.shopCommissionRate !== undefined) {
    const serviceAmount = updates.serviceAmount;
    const rate = updates.shopCommissionRate;
    const shopCommissionAmount = serviceAmount * rate;
    const totalEarnings = serviceAmount * (1 - rate) + tips;
    updateData.serviceAmount = serviceAmount.toString();
    updateData.shopCommissionAmount = shopCommissionAmount.toString();
    updateData.totalEarnings = totalEarnings.toString();
    updateData.hourlyPay = null;
    if (updates.hours !== undefined && updates.hours >= 0) {
      updateData.hours = updates.hours.toString();
    } else if (updates.hours === null || updates.hours === undefined) {
      updateData.hours = record.hours;
    }
    if (updates.cashTips !== undefined) updateData.cashTips = cashTips.toString();
    if (updates.cardTips !== undefined) updateData.cardTips = cardTips.toString();
  }
  // Hourly mode: legacy single serviceTypeId + hours (for records without line items)
  else if ((updates.hours !== undefined || updates.hourlyPay !== undefined) && !isCommissionRecord) {
    const hours = updates.hours ?? parseFloat(record.hours as any) ?? 0;
    const hourlyPay = updates.hourlyPay ?? parseFloat(record.hourlyPay as any) ?? 0;
    updateData.totalEarnings = (hours * hourlyPay + tips).toString();
    updateData.hours = hours.toString();
    updateData.hourlyPay = hourlyPay.toString();
    updateData.serviceAmount = null;
    updateData.shopCommissionAmount = null;
    if (updates.cashTips !== undefined) updateData.cashTips = cashTips.toString();
    if (updates.cardTips !== undefined) updateData.cardTips = cardTips.toString();
  } else if (updates.hours !== undefined && isCommissionRecord) {
    const h = updates.hours;
    updateData.hours = h >= 0 ? String(h) : null;
  } else if (updates.cashTips !== undefined || updates.cardTips !== undefined) {
    if (isCommissionRecord) {
      const serviceAmount = parseFloat(record.serviceAmount as any);
      const rate = parseFloat(record.shopCommissionAmount as any) / serviceAmount;
      updateData.totalEarnings = (serviceAmount * (1 - rate) + tips).toString();
    } else {
      const lineItems = await getWorkRecordLineItems(recordId);
      let hourlyTotal = 0;
      if (lineItems.length > 0) {
        for (const li of lineItems) {
          hourlyTotal += parseFloat(li.hours as any) * parseFloat(li.hourlyPay as any);
        }
      } else {
        const hours = parseFloat(record.hours as any) ?? 0;
        const hourlyPay = parseFloat(record.hourlyPay as any) ?? 0;
        hourlyTotal = hours * hourlyPay;
      }
      updateData.totalEarnings = (hourlyTotal + tips).toString();
    }
    updateData.cashTips = cashTips.toString();
    updateData.cardTips = cardTips.toString();
  }

  const result = await db
    .update(workRecords)
    .set(updateData)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
    .returning();

  if (!result[0]) throw new Error("Failed to update work record");

  return result[0];
}

export async function getWorkRecordLineItems(workRecordId: number): Promise<WorkRecordLineItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workRecordLineItems)
    .where(eq(workRecordLineItems.workRecordId, workRecordId));
}

export async function deleteWorkRecord(recordId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(workRecords)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)));
}

// ============ 統計相關查詢 ============

export type StatsResult = {
  totalHours: number;
  totalEarnings: number;
  totalTips: number;
  totalCashTips: number;
  totalCardTips: number;
  totalShopCommission: number;
  byShop: Record<
    number,
    { shopName: string; hours: number; earnings: number; tips: number; cashTips: number; cardTips: number; shopCommission: number }
  >;
};

async function aggregateWorkRecordsToStats(
  userId: number,
  records: WorkRecordWithLineItems[],
  shopIdsFilter?: number[]
): Promise<StatsResult> {
  const stats: StatsResult = {
    totalHours: 0,
    totalEarnings: 0,
    totalTips: 0,
    totalCashTips: 0,
    totalCardTips: 0,
    totalShopCommission: 0,
    byShop: {},
  };

  const shopIdsSet = shopIdsFilter != null && shopIdsFilter.length > 0
    ? new Set(shopIdsFilter)
    : null;

  for (const record of records) {
    if (shopIdsSet != null && !shopIdsSet.has(record.shopId)) continue;

    let hours = 0;
    if (record.lineItems && record.lineItems.length > 0) {
      hours = record.lineItems.reduce((sum, li) => sum + li.hours, 0);
    } else if (record.hours != null) {
      hours = parseFloat(record.hours as any);
    }
    const earnings = parseFloat(record.totalEarnings as any);
    const cashTips = parseFloat((record as any).cashTips as any) || 0;
    const cardTips = parseFloat((record as any).cardTips as any) || 0;
    const tips = cashTips + cardTips;
    const shopCommission =
      record.shopCommissionAmount != null
        ? parseFloat(record.shopCommissionAmount as any)
        : 0;

    stats.totalHours += hours;
    stats.totalEarnings += earnings;
    stats.totalTips += tips;
    stats.totalCashTips += cashTips;
    stats.totalCardTips += cardTips;
    stats.totalShopCommission += shopCommission;

    if (!stats.byShop[record.shopId]) {
      const shop = await getShopByIdForUser(record.shopId, userId);
      stats.byShop[record.shopId] = {
        shopName: shop?.name || "Unknown",
        hours: 0,
        earnings: 0,
        tips: 0,
        cashTips: 0,
        cardTips: 0,
        shopCommission: 0,
      };
    }

    stats.byShop[record.shopId].hours += hours;
    stats.byShop[record.shopId].earnings += earnings;
    stats.byShop[record.shopId].tips += tips;
    stats.byShop[record.shopId].cashTips += cashTips;
    stats.byShop[record.shopId].cardTips += cardTips;
    stats.byShop[record.shopId].shopCommission += shopCommission;
  }
  
  return stats;
}

export async function getMonthlyStats(
  userId: number,
  year: number,
  month: number,
  workerId?: number,
  shopIds?: number[]
): Promise<StatsResult | null> {
  const db = await getDb();
  if (!db) return null;

  const lastDay = new Date(year, month, 0).getDate();
  const startYmd = `${year}-${String(month).padStart(2, "0")}-01`;
  const endYmd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const records = (await getUserWorkRecords(
    userId,
    workerId,
    startYmd,
    endYmd
  )) as WorkRecordWithLineItems[];
  return aggregateWorkRecordsToStats(userId, records, shopIds);
}

/** One DB read for the calendar year; buckets by `workDate` month (YYYY-MM-DD). */
export type YearMonthStat = {
  month: number;
  totalEarnings: number;
  totalHours: number;
};

export type TimelinePeriod = "week" | "month" | "year";

export type TimelinePoint = {
  bucketStart: string;
  totalEarnings: number | null;
  totalHours: number | null;
};

export type TimelineStats = {
  period: TimelinePeriod;
  startDate: string;
  endDate: string;
  points: TimelinePoint[];
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseYmdParts(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split("-").map((part) => parseInt(part, 10));
  return { year, month, day };
}

function ymdToUtcDate(ymd: string): Date {
  const { year, month, day } = parseYmdParts(ymd);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateToYmd(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function addDaysToYmd(ymd: string, deltaDays: number): string {
  const date = ymdToUtcDate(ymd);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return utcDateToYmd(date);
}

function monthStartForYmd(ymd: string): string {
  const { year, month } = parseYmdParts(ymd);
  return `${year}-${pad2(month)}-01`;
}

function monthEndForYmd(ymd: string): string {
  const { year, month } = parseYmdParts(ymd);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad2(month)}-${pad2(lastDay)}`;
}

function weekStartForYmd(ymd: string): string {
  const weekday = ymdToUtcDate(ymd).getUTCDay();
  return addDaysToYmd(ymd, -weekday);
}

function getTodayYmdInVancouver(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getRecordHoursAndEarnings(record: WorkRecordWithLineItems): { hours: number; earnings: number } | null {
  let hours = 0;
  if (record.lineItems && record.lineItems.length > 0) {
    hours = record.lineItems.reduce((sum, li) => sum + li.hours, 0);
  } else if (record.hours != null) {
    hours = parseFloat(record.hours as any);
  }

  const earnings = parseFloat(record.totalEarnings as any);
  if (Number.isNaN(earnings)) {
    return null;
  }

  return {
    hours: Number.isNaN(hours) ? 0 : hours,
    earnings,
  };
}

export async function getYearMonthlyTotals(
  userId: number,
  year: number,
  workerId?: number,
  shopIds?: number[]
): Promise<YearMonthStat[]> {
  const startYmd = `${year}-01-01`;
  const endYmd = `${year}-12-31`;
  const records = (await getUserWorkRecords(
    userId,
    workerId,
    startYmd,
    endYmd
  )) as WorkRecordWithLineItems[];

  const shopIdsSet =
    shopIds != null && shopIds.length > 0 ? new Set(shopIds) : null;

  const buckets: YearMonthStat[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalEarnings: 0,
    totalHours: 0,
  }));

  for (const record of records) {
    if (shopIdsSet != null && !shopIdsSet.has(record.shopId)) continue;

    const workDate = record.workDate as string;
    const monthPart = parseInt(workDate.slice(5, 7), 10);
    if (Number.isNaN(monthPart) || monthPart < 1 || monthPart > 12) continue;

    let hours = 0;
    if (record.lineItems && record.lineItems.length > 0) {
      hours = record.lineItems.reduce((sum, li) => sum + li.hours, 0);
    } else if (record.hours != null) {
      hours = parseFloat(record.hours as any);
    }
    const earnings = parseFloat(record.totalEarnings as any);
    if (Number.isNaN(earnings)) continue;

    const b = buckets[monthPart - 1];
    b.totalEarnings += earnings;
    b.totalHours += Number.isNaN(hours) ? 0 : hours;
  }

  return buckets;
}

export async function getTimelineStats(
  userId: number,
  period: TimelinePeriod,
  anchorDateYmd: string,
  workerId?: number,
  shopIds?: number[]
): Promise<TimelineStats> {
  let startDate = "";
  let endDate = "";
  let bucketStarts: string[] = [];

  if (period === "week") {
    startDate = weekStartForYmd(anchorDateYmd);
    endDate = addDaysToYmd(startDate, 6);
    bucketStarts = Array.from({ length: 7 }, (_, index) => addDaysToYmd(startDate, index));
  } else if (period === "month") {
    startDate = monthStartForYmd(anchorDateYmd);
    endDate = monthEndForYmd(anchorDateYmd);
    const totalDays = Math.floor(
      (ymdToUtcDate(endDate).getTime() - ymdToUtcDate(startDate).getTime()) / 86400000
    ) + 1;
    bucketStarts = Array.from({ length: totalDays }, (_, index) => addDaysToYmd(startDate, index));
  } else {
    const { year } = parseYmdParts(anchorDateYmd);
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
    bucketStarts = Array.from({ length: 12 }, (_, index) => `${year}-${pad2(index + 1)}-01`);
  }

  const records = (await getUserWorkRecords(
    userId,
    workerId,
    startDate,
    endDate
  )) as WorkRecordWithLineItems[];

  const shopIdsSet = shopIds != null && shopIds.length > 0 ? new Set(shopIds) : null;
  const totalsByBucket = new Map<string, { earnings: number; hours: number }>();

  for (const record of records) {
    if (shopIdsSet != null && !shopIdsSet.has(record.shopId)) {
      continue;
    }

    const metrics = getRecordHoursAndEarnings(record);
    if (!metrics) {
      continue;
    }

    const bucketKey =
      period === "year"
        ? monthStartForYmd(record.workDate as string)
        : (record.workDate as string);
    const existing = totalsByBucket.get(bucketKey) ?? { earnings: 0, hours: 0 };
    existing.earnings += metrics.earnings;
    existing.hours += metrics.hours;
    totalsByBucket.set(bucketKey, existing);
  }

  const todayYmd = getTodayYmdInVancouver();
  const todayMonthStart = monthStartForYmd(todayYmd);
  const points = bucketStarts.map((bucketStart) => {
    const isFuture = period === "year" ? bucketStart > todayMonthStart : bucketStart > todayYmd;
    const totals = totalsByBucket.get(bucketStart);

    return {
      bucketStart,
      totalEarnings: isFuture ? null : totals?.earnings ?? 0,
      totalHours: isFuture ? null : totals?.hours ?? 0,
    };
  });

  return {
    period,
    startDate,
    endDate,
    points,
  };
}

export async function getStatsForDateRange(
  userId: number,
  startDateYmd: string,
  endDateYmd: string,
  workerId?: number,
  shopIds?: number[]
): Promise<StatsResult | null> {
  const db = await getDb();
  if (!db) return null;

  const records = (await getUserWorkRecords(userId, workerId, startDateYmd, endDateYmd)) as WorkRecordWithLineItems[];
  return aggregateWorkRecordsToStats(userId, records, shopIds);
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

function parseStoredUiLocale(raw: string): UserPreferenceUiLocale {
  return (USER_PREFERENCE_UI_LOCALES as readonly string[]).includes(raw)
    ? (raw as UserPreferenceUiLocale)
    : DEFAULT_USER_PREFERENCE_UI_LOCALE;
}

function parseStoredCurrency(raw: string): UserPreferenceCurrency {
  return (USER_PREFERENCE_CURRENCIES as readonly string[]).includes(raw)
    ? (raw as UserPreferenceCurrency)
    : DEFAULT_USER_PREFERENCE_CURRENCY;
}

export type ResolvedUserPreferences = {
  uiLocale: UserPreferenceUiLocale;
  currencyCode: UserPreferenceCurrency;
  defaultWorkerId: number | null;
};

export async function getUserPreferencesForUser(
  userId: number
): Promise<ResolvedUserPreferences> {
  const db = await getDb();
  if (!db) {
    return {
      uiLocale: DEFAULT_USER_PREFERENCE_UI_LOCALE,
      currencyCode: DEFAULT_USER_PREFERENCE_CURRENCY,
      defaultWorkerId: null,
    };
  }

  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (!result[0]) {
    return {
      uiLocale: DEFAULT_USER_PREFERENCE_UI_LOCALE,
      currencyCode: DEFAULT_USER_PREFERENCE_CURRENCY,
      defaultWorkerId: null,
    };
  }

  return {
    uiLocale: parseStoredUiLocale(result[0].uiLocale),
    currencyCode: parseStoredCurrency(result[0].currencyCode),
    defaultWorkerId: result[0].defaultWorkerId ?? null,
  };
}

export async function updateUserPreferences(
  userId: number,
  patch: {
    uiLocale?: UserPreferenceUiLocale;
    currencyCode?: UserPreferenceCurrency;
    defaultWorkerId?: number | null;
  }
): Promise<ResolvedUserPreferences> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const current = await getUserPreferencesForUser(userId);
  const next: ResolvedUserPreferences = {
    uiLocale: patch.uiLocale ?? current.uiLocale,
    currencyCode: patch.currencyCode ?? current.currencyCode,
    defaultWorkerId:
      patch.defaultWorkerId !== undefined
        ? patch.defaultWorkerId
        : current.defaultWorkerId,
  };

  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(userPreferences)
      .set({
        uiLocale: next.uiLocale,
        currencyCode: next.currencyCode,
        defaultWorkerId: next.defaultWorkerId,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, userId));
  } else {
    await db.insert(userPreferences).values({
      userId,
      uiLocale: next.uiLocale,
      currencyCode: next.currencyCode,
      defaultWorkerId: next.defaultWorkerId,
    });
  }

  return next;
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

export async function savePushSubscription(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, subscription.endpoint)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }
}

export async function getPushSubscriptionsByUserId(
  userId: number
): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  return rows.map((r) => ({
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
  }));
}

/** 取得當前應發送提醒的使用者（isEnabled、reminderTime、reminderDays 符合） */
export async function getUsersToNotifyForReminder(
  currentHour: number,
  currentMinute: number,
  dayOfWeek: number
): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const settings = await db.select().from(notificationSettings);

  const userIds: number[] = [];
  for (const s of settings) {
    if (!s.isEnabled) continue;
    const [h, m] = s.reminderTime.split(":").map(Number);
    if (h !== currentHour || m !== currentMinute) continue;
    let days: number[];
    try {
      days = JSON.parse(s.reminderDays);
    } catch {
      continue;
    }
    if (days.includes(dayOfWeek)) {
      userIds.push(s.userId);
    }
  }
  return userIds;
}
