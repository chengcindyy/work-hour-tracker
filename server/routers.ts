import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getUserWorkers,
  createWorker,
  updateWorker,
  archiveWorker,
  assertWorkerBelongsToUser,
  getUserShops,
  getShopById,
  getShopByIdForUser,
  createShop,
  updateShop,
  deleteShop,
  getShopServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  getUserWorkRecords,
  getWorkRecordById,
  createWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
  getMonthlyStats,
  getStatsForDateRange,
  getNotificationSettings,
  upsertNotificationSettings,
  savePushSubscription,
} from "./db";
import { getSettlementPeriods } from "./_core/settlementUtils";
import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ 成員／工作者管理 ============
  workers: router({
    list: protectedProcedure.query(({ ctx }) => {
      return getUserWorkers(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "成員名稱不能為空"),
        })
      )
      .mutation(({ ctx, input }) => {
        return createWorker(ctx.user.id, input.name);
      }),

    update: protectedProcedure
      .input(
        z.object({
          workerId: z.number(),
          name: z.string().min(1).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        const updates: { name?: string; isActive?: boolean } = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.isActive !== undefined) updates.isActive = input.isActive;
        if (Object.keys(updates).length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "請提供要更新的欄位（name 或 isActive）",
          });
        }
        return updateWorker(ctx.user.id, input.workerId, updates);
      }),

    archive: protectedProcedure
      .input(
        z.object({
          workerId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        await archiveWorker(ctx.user.id, input.workerId);
        return { success: true as const };
      }),
  }),

  // ============ 店家管理 ============
  shops: router({
    list: protectedProcedure
      .input(z.object({ workerId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        return getUserShops(ctx.user.id, input.workerId);
      }),

    get: protectedProcedure
      .input(z.object({ shopId: z.number(), workerId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        return getShopById(input.shopId, ctx.user.id, input.workerId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          workerId: z.number(),
          name: z.string().min(1, "店家名稱不能為空"),
          description: z.string().optional(),
          payType: z.enum(["hourly", "commission"]).default("hourly"),
          shopCommissionRate: z.number().min(0).max(1).optional(),
          settlementType: z.enum(["fixed_dates", "month_end", "cycle"]).nullable().optional(),
          settlementDates: z.array(z.number().min(1).max(31)).optional(),
          settlementAnchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
          settlementCycleDays: z.number().min(1).max(31).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        if (input.payType === "commission" && (input.shopCommissionRate == null || input.shopCommissionRate < 0 || input.shopCommissionRate > 1)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "抽成制請設定店家抽成比例（0～1）",
          });
        }
        if (input.settlementType === "fixed_dates" && (!input.settlementDates || input.settlementDates.length === 0)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "固定日期模式請設定結算日期（1～31）",
          });
        }
        if (input.settlementType === "cycle" && (!input.settlementAnchorDate || !input.settlementCycleDays)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "週期制請設定錨點日期與週期天數",
          });
        }
        const settlement =
          input.settlementType != null
            ? {
                settlementType: input.settlementType,
                settlementDates: input.settlementType === "fixed_dates" ? input.settlementDates ?? null : null,
                settlementAnchorDate: input.settlementType === "cycle" ? input.settlementAnchorDate ?? null : null,
                settlementCycleDays: input.settlementType === "cycle" ? input.settlementCycleDays ?? null : null,
              }
            : undefined;
        return createShop(
          ctx.user.id,
          input.workerId,
          input.name,
          input.description,
          input.payType,
          input.shopCommissionRate,
          settlement
        );
      }),

    update: protectedProcedure
      .input(
        z.object({
          shopId: z.number(),
          workerId: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          payType: z.enum(["hourly", "commission"]).optional(),
          shopCommissionRate: z.number().min(0).max(1).optional(),
          settlementType: z.enum(["fixed_dates", "month_end", "cycle"]).nullable().optional(),
          settlementDates: z.array(z.number().min(1).max(31)).nullable().optional(),
          settlementAnchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
          settlementCycleDays: z.number().min(1).max(31).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
        }
        const targetPayType = input.payType ?? (shop as any).payType ?? "hourly";
        if (targetPayType === "commission" && input.shopCommissionRate == null && (shop as any).shopCommissionRate == null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "抽成制請設定店家抽成比例（0～1）",
          });
        }
        if (input.settlementType === "fixed_dates" && (input.settlementDates == null || input.settlementDates.length === 0)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "固定日期模式請設定結算日期（1～31）",
          });
        }
        if (input.settlementType === "cycle" && (input.settlementAnchorDate == null || input.settlementCycleDays == null)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "週期制請設定錨點日期與週期天數",
          });
        }

        const updates: Parameters<typeof updateShop>[3] = {
          name: input.name,
          description: input.description,
          isActive: input.isActive,
          payType: input.payType,
          shopCommissionRate: input.shopCommissionRate,
          settlementType: input.settlementType,
          settlementDates: input.settlementDates,
          settlementAnchorDate: input.settlementAnchorDate,
          settlementCycleDays: input.settlementCycleDays,
        };
        if (input.settlementType !== undefined) {
          if (input.settlementType === null) {
            updates.settlementDates = null;
            updates.settlementAnchorDate = null;
            updates.settlementCycleDays = null;
          } else if (input.settlementType === "fixed_dates") {
            updates.settlementAnchorDate = null;
            updates.settlementCycleDays = null;
          } else if (input.settlementType === "month_end") {
            updates.settlementDates = null;
            updates.settlementAnchorDate = null;
            updates.settlementCycleDays = null;
          } else if (input.settlementType === "cycle") {
            updates.settlementDates = null;
          }
        }
        return updateShop(input.shopId, ctx.user.id, input.workerId, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ shopId: z.number(), workerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
        }

        await deleteShop(input.shopId, ctx.user.id, input.workerId);
        return { success: true };
      }),
  }),

  // ============ 服務類型管理 ============
  serviceTypes: router({
    listByShop: protectedProcedure
      .input(
        z.object({
          shopId: z.number(),
          workerId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
        }

        return getShopServiceTypes(input.shopId, input.workerId);
      }),

    get: protectedProcedure
      .input(z.object({ serviceTypeId: z.number() }))
      .query(({ input }) => {
        return getServiceTypeById(input.serviceTypeId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          shopId: z.number(),
          workerId: z.number(),
          name: z.string().min(1, "服務類型名稱不能為空"),
          hourlyPay: z.number().min(0, "時薪不能為負數"),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);

        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
        }
        const payType = (shop as any).payType ?? "hourly";
        if (payType === "hourly" && input.hourlyPay <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "時薪制店家的時薪必須大於 0" });
        }

        return createServiceType(
          input.shopId,
          input.workerId,
          input.name,
          input.hourlyPay,
          input.description
        );
      }),

    update: protectedProcedure
      .input(
        z.object({
          serviceTypeId: z.number(),
          name: z.string().min(1).optional(),
          hourlyPay: z.number().min(0).optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const serviceType = await getServiceTypeById(input.serviceTypeId);
        if (!serviceType) {
          throw new TRPCError({ code: "NOT_FOUND", message: "服務類型不存在" });
        }
        if (input.hourlyPay !== undefined && input.hourlyPay < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "時薪不能為負數" });
        }

        return updateServiceType(input.serviceTypeId, {
          name: input.name,
          hourlyPay: input.hourlyPay,
          description: input.description,
          isActive: input.isActive,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ serviceTypeId: z.number() }))
      .mutation(async ({ input }) => {
        const serviceType = await getServiceTypeById(input.serviceTypeId);
        if (!serviceType) {
          throw new TRPCError({ code: "NOT_FOUND", message: "服務類型不存在" });
        }

        await deleteServiceType(input.serviceTypeId);
        return { success: true };
      }),
  }),

  // ============ 工時紀錄管理 ============
  workRecords: router({
    list: protectedProcedure
      .input(
        z.object({
          workerId: z.number().optional(),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const workerId = input.workerId;
        if (workerId !== undefined) {
          await assertWorkerBelongsToUser(workerId, ctx.user.id);
        }
        return getUserWorkRecords(ctx.user.id, workerId, input.startDate, input.endDate);
      }),

    get: protectedProcedure
      .input(z.object({ recordId: z.number() }))
      .query(({ ctx, input }) => {
        return getWorkRecordById(input.recordId, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          workerId: z.number(),
          shopId: z.number(),
          serviceTypeId: z.number().optional(),
          workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD"),
          hours: z.number().min(0).optional(),
          serviceAmount: z.number().positive().optional(),
          lineItems: z
            .array(z.object({ serviceTypeId: z.number(), hours: z.number().positive() }))
            .min(1, "時薪制請至少新增一筆項目")
            .optional(),
          cashTips: z.number().nonnegative("現金小費不能為負數").default(0),
          cardTips: z.number().nonnegative("刷卡小費不能為負數").default(0),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);

        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
        }

        const payType = (shop as any).payType ?? "hourly";

        if (payType === "hourly") {
          if (!input.lineItems || input.lineItems.length === 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "時薪制請至少新增一筆項目" });
          }
          for (const item of input.lineItems) {
            const st = await getServiceTypeById(item.serviceTypeId);
            if (!st) throw new TRPCError({ code: "NOT_FOUND", message: `服務類型 ${item.serviceTypeId} 不存在` });
          }
          return createWorkRecord(
            ctx.user.id,
            input.workerId,
            input.shopId,
            input.workDate,
            input.cashTips,
            input.cardTips,
            input.notes,
            { mode: "hourly", lineItems: input.lineItems }
          );
        } else {
          if (input.serviceAmount == null || input.serviceAmount <= 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "抽成制請輸入服務總金額" });
          }
          if (input.serviceTypeId == null) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "抽成制請選擇服務類型" });
          }
          const serviceType = await getServiceTypeById(input.serviceTypeId);
          if (!serviceType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "服務類型不存在" });
          }
          const rate = parseFloat((shop as any).shopCommissionRate as any);
          if (isNaN(rate) || rate < 0 || rate > 1) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "店家抽成比例設定有誤" });
          }
          return createWorkRecord(
            ctx.user.id,
            input.workerId,
            input.shopId,
            input.workDate,
            input.cashTips,
            input.cardTips,
            input.notes,
            {
              mode: "commission",
              serviceTypeId: input.serviceTypeId,
              serviceAmount: input.serviceAmount,
              shopCommissionRate: rate,
              hours: input.hours != null && input.hours >= 0 ? input.hours : undefined,
            }
          );
        }
      }),

    update: protectedProcedure
      .input(
        z.object({
          recordId: z.number(),
          workerId: z.number().optional(),
          shopId: z.number().optional(),
          serviceTypeId: z.number().optional(),
          workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD").optional(),
          hours: z.number().positive().optional(),
          serviceAmount: z.number().positive().optional(),
          lineItems: z
            .array(z.object({ serviceTypeId: z.number(), hours: z.number().positive() }))
            .min(1)
            .optional(),
          cashTips: z.number().nonnegative().optional(),
          cardTips: z.number().nonnegative().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const record = await getWorkRecordById(input.recordId, ctx.user.id);
        if (!record) {
          throw new TRPCError({ code: "NOT_FOUND", message: "工時紀錄不存在" });
        }

        if (input.workerId !== undefined) {
          await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        }

        const updates: Parameters<typeof updateWorkRecord>[2] = {
          workerId: input.workerId,
          shopId: input.shopId,
          serviceTypeId: input.serviceTypeId,
          workDate: input.workDate,
          hours: input.hours,
          serviceAmount: input.serviceAmount,
          lineItems: input.lineItems,
          cashTips: input.cashTips,
          cardTips: input.cardTips,
          notes: input.notes,
        };

        const isCommissionRecord = record.serviceAmount != null && parseFloat(record.serviceAmount as any) > 0;

        if (input.serviceAmount != null) {
          const shopId = input.shopId ?? record.shopId;
          const shop = await getShopByIdForUser(shopId, ctx.user.id);
          if (!shop) throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
          const rate = parseFloat((shop as any).shopCommissionRate as any);
          if (isNaN(rate) || rate < 0 || rate > 1) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "店家抽成比例設定有誤" });
          }
          updates.shopCommissionRate = rate;
        } else if (input.lineItems != null && input.lineItems.length > 0 && !isCommissionRecord) {
          for (const item of input.lineItems) {
            const st = await getServiceTypeById(item.serviceTypeId);
            if (!st) throw new TRPCError({ code: "NOT_FOUND", message: `服務類型 ${item.serviceTypeId} 不存在` });
          }
        } else if (input.hours != null && !isCommissionRecord && !input.lineItems) {
          let hourlyPay = input.serviceTypeId
            ? parseFloat((await getServiceTypeById(input.serviceTypeId))?.hourlyPay as any)
            : parseFloat(record.hourlyPay as any);
          if (isNaN(hourlyPay)) hourlyPay = 0;
          updates.hourlyPay = hourlyPay;
        }

        return updateWorkRecord(input.recordId, ctx.user.id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ recordId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const record = await getWorkRecordById(input.recordId, ctx.user.id);
        if (!record) {
          throw new TRPCError({ code: "NOT_FOUND", message: "工時紀錄不存在" });
        }

        await deleteWorkRecord(input.recordId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ 統計報表 ============
  stats: router({
    monthlyStats: protectedProcedure
      .input(
        z.object({
          workerId: z.number().optional(),
          year: z.number(),
          month: z.number().min(1).max(12),
          shopIds: z.array(z.number()).optional(),
        })
      )
      .query(({ ctx, input }) => {
        return getMonthlyStats(ctx.user.id, input.year, input.month, input.workerId, input.shopIds);
      }),

    settlementPeriods: protectedProcedure
      .input(
        z.object({
          shopId: z.number(),
          workerId: z.number(),
          year: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
        }
        const config = {
          settlementType: (shop as any).settlementType ?? null,
          settlementDates: (shop as any).settlementDates ?? null,
          settlementAnchorDate: (shop as any).settlementAnchorDate ?? null,
          settlementCycleDays: (shop as any).settlementCycleDays != null ? Number((shop as any).settlementCycleDays) : null,
        };
        const periods = getSettlementPeriods(config, input.year);
        const formatLocalDate = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };
        return periods.map((p) => ({
          startDate: formatLocalDate(p.startDate),
          endDate: formatLocalDate(p.endDate),
          label: p.label,
        }));
      }),

    byDateRange: protectedProcedure
      .input(
        z.object({
          workerId: z.number().optional(),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          shopIds: z.array(z.number()).optional(),
        })
      )
      .query(({ ctx, input }) => {
        if (input.startDate > input.endDate) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "開始日期不可晚於結束日期" });
        }
        return getStatsForDateRange(
          ctx.user.id,
          input.startDate,
          input.endDate,
          input.workerId,
          input.shopIds
        );
      }),
  }),

  // ============ 推播通知設定 ============
  notifications: router({
    getSettings: protectedProcedure.query(({ ctx }) => {
      return getNotificationSettings(ctx.user.id);
    }),

    getVapidPublicKey: protectedProcedure.query(() => {
      return { publicKey: ENV.vapidPublicKey || null };
    }),

    savePushSubscription: protectedProcedure
      .input(
        z.object({
          endpoint: z.string().url(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
        })
      )
      .mutation(({ ctx, input }) => {
        return savePushSubscription(ctx.user.id, input);
      }),

    updateSettings: protectedProcedure
      .input(
        z.object({
          isEnabled: z.boolean(),
          reminderTime: z.string().regex(/^\d{2}:\d{2}$/, "時間格式必須為 HH:mm"),
          reminderDays: z.array(z.number().min(0).max(6)),
        })
      )
      .mutation(({ ctx, input }) => {
        return upsertNotificationSettings(
          ctx.user.id,
          input.isEnabled,
          input.reminderTime,
          input.reminderDays
        );
      }),
  }),
});

export type AppRouter = typeof appRouter;
