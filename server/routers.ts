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
  getNotificationSettings,
  upsertNotificationSettings,
} from "./db";
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        return createShop(ctx.user.id, input.workerId, input.name, input.description);
      }),

    update: protectedProcedure
      .input(
        z.object({
          shopId: z.number(),
          workerId: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);
        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
        }

        return updateShop(input.shopId, ctx.user.id, input.workerId, {
          name: input.name,
          description: input.description,
          isActive: input.isActive,
        });
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
          hourlyPay: z.number().positive("時薪必須大於 0"),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);

        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
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
          hourlyPay: z.number().positive().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const serviceType = await getServiceTypeById(input.serviceTypeId);
        if (!serviceType) {
          throw new TRPCError({ code: "NOT_FOUND", message: "服務類型不存在" });
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
          startDate: z.date().optional(),
          endDate: z.date().optional(),
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
          serviceTypeId: z.number(),
          workDate: z.date(),
          hours: z.number().positive("時數必須大於 0"),
          tips: z.number().nonnegative("小費不能為負數").default(0),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertWorkerBelongsToUser(input.workerId, ctx.user.id);

        const shop = await getShopById(input.shopId, ctx.user.id, input.workerId);
        if (!shop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "店家不存在" });
        }

        const serviceType = await getServiceTypeById(input.serviceTypeId);
        if (!serviceType) {
          throw new TRPCError({ code: "NOT_FOUND", message: "服務類型不存在" });
        }

        const hourlyPay = parseFloat(serviceType.hourlyPay as any);

        return createWorkRecord(
          ctx.user.id,
          input.workerId,
          input.shopId,
          input.serviceTypeId,
          input.workDate,
          input.hours,
          input.tips,
          hourlyPay,
          input.notes
        );
      }),

    update: protectedProcedure
      .input(
        z.object({
          recordId: z.number(),
          workerId: z.number().optional(),
          shopId: z.number().optional(),
          serviceTypeId: z.number().optional(),
          workDate: z.date().optional(),
          hours: z.number().positive().optional(),
          tips: z.number().nonnegative().optional(),
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

        let hourlyPay = parseFloat(record.hourlyPay as any);

        if (input.serviceTypeId) {
          const serviceType = await getServiceTypeById(input.serviceTypeId);
          if (!serviceType) {
            throw new TRPCError({ code: "NOT_FOUND", message: "服務類型不存在" });
          }
          hourlyPay = parseFloat(serviceType.hourlyPay as any);
        }

        return updateWorkRecord(input.recordId, ctx.user.id, {
          workerId: input.workerId,
          shopId: input.shopId,
          serviceTypeId: input.serviceTypeId,
          workDate: input.workDate,
          hours: input.hours,
          tips: input.tips,
          hourlyPay,
          notes: input.notes,
        });
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
        })
      )
      .query(({ ctx, input }) => {
        return getMonthlyStats(ctx.user.id, input.year, input.month, input.workerId);
      }),
  }),

  // ============ 推播通知設定 ============
  notifications: router({
    getSettings: protectedProcedure.query(({ ctx }) => {
      return getNotificationSettings(ctx.user.id);
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
