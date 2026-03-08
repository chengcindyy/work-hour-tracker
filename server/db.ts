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
  workers,
  type Shop,
  type ServiceType,
  type WorkRecord,
  type WorkRecordLineItem,
  type NotificationSetting,
  type Worker,
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
  startDate?: Date,
  endDate?: Date
): Promise<WorkRecordWithLineItems[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(workRecords.userId, userId)];

  if (workerId !== undefined) {
    conditions.push(eq(workRecords.workerId, workerId));
  }

  if (startDate) {
    conditions.push(gte(workRecords.workDate, formatDateForDb(startDate)));
  }
  if (endDate) {
    conditions.push(lte(workRecords.workDate, formatDateForDb(endDate)));
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
  workDate: Date,
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
    workDate: formatDateForDb(workDate),
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
    workDate?: Date;
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
    updateData.workDate = formatDateForDb(updates.workDate);
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

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const records = (await getUserWorkRecords(userId, workerId, startDate, endDate)) as WorkRecordWithLineItems[];
  return aggregateWorkRecordsToStats(userId, records, shopIds);
}

export async function getStatsForDateRange(
  userId: number,
  startDate: Date,
  endDate: Date,
  workerId?: number,
  shopIds?: number[]
): Promise<StatsResult | null> {
  const db = await getDb();
  if (!db) return null;

  const records = (await getUserWorkRecords(userId, workerId, startDate, endDate)) as WorkRecordWithLineItems[];
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
