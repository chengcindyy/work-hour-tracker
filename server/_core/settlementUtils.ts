/**
 * 結算區間計算工具
 * 支援三種模式：fixed_dates、month_end、cycle
 */

import {
  addDays,
  isWithinInterval,
  format,
  lastDayOfMonth,
} from "date-fns";

/** 解析 YYYY-MM-DD 為本地日期，避免 parseISO 的 UTC 時區偏移 */
function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
import { zhTW } from "date-fns/locale";

export type SettlementType = "fixed_dates" | "month_end" | "cycle" | null;

export interface SettlementPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface ShopSettlementConfig {
  settlementType: SettlementType;
  settlementDates: string | null; // JSON "[8,23]"
  settlementAnchorDate: string | null; // "YYYY-MM-DD"
  settlementCycleDays: number | null;
}

function parseSettlementDates(settlementDates: string | null): number[] {
  if (!settlementDates) return [];
  try {
    const arr = JSON.parse(settlementDates) as number[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((n) => typeof n === "number" && n >= 1 && n <= 31)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/**
 * 取得固定日期模式的結算區間
 * 例如 [8, 23] 表示：區間1 = 9號～23號，區間2 = 24號～次月8號
 */
function getFixedDatesPeriods(dates: number[], year: number): SettlementPeriod[] {
  if (dates.length === 0) return [];

  const periods: SettlementPeriod[] = [];

  for (let month = 1; month <= 12; month++) {
    for (let i = 0; i < dates.length; i++) {
      const currDay = dates[i];
      const prevDay = dates[(i - 1 + dates.length) % dates.length];

      let startDate: Date;
      let endDate: Date;

      const lastDayOfCurrMonth = lastDayOfMonth(new Date(year, month - 1, 1)).getDate();
      const effectiveEndDay = Math.min(currDay, lastDayOfCurrMonth);

      if (i === 0) {
        // 第一個結算日：從上月最後一個結算日+1 到本月此結算日
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevMonthLastDay = lastDayOfMonth(new Date(prevYear, prevMonth - 1, 1)).getDate();
        const prevDayCapped = Math.min(dates[dates.length - 1], prevMonthLastDay);
        const prevMonthLastSettlement = new Date(prevYear, prevMonth - 1, prevDayCapped);
        startDate = addDays(prevMonthLastSettlement, 1);
        endDate = new Date(year, month - 1, effectiveEndDay);
      } else {
        startDate = new Date(year, month - 1, prevDay + 1);
        endDate = new Date(year, month - 1, effectiveEndDay);
      }

      // 跨月區間：若 endDate 因 cap 變成上月，則略過（不應發生，因已用 effectiveEndDay）
      if (i === 0 && endDate.getMonth() !== month - 1) continue;

      periods.push({
        startDate,
        endDate,
        label: `${format(startDate, "M/d", { locale: zhTW })} - ${format(endDate, "M/d", { locale: zhTW })}`,
      });
    }
  }

  return periods
    .filter((p) => p.startDate.getFullYear() === year || p.endDate.getFullYear() === year)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * 取得月底模式的結算區間
 */
function getMonthEndPeriods(year: number): SettlementPeriod[] {
  const periods: SettlementPeriod[] = [];

  for (let month = 1; month <= 12; month++) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = lastDayOfMonth(startDate);

    periods.push({
      startDate,
      endDate,
      label: `${format(startDate, "yyyy/M/d", { locale: zhTW })} - ${format(endDate, "M/d", { locale: zhTW })}`,
    });
  }

  return periods;
}

/**
 * 取得週期制模式的結算區間
 * 從 anchorDate 起每 cycleDays 天一個區間
 */
function getCyclePeriods(
  anchorDateStr: string,
  cycleDays: number,
  year: number
): SettlementPeriod[] {
  const anchorDate = parseDateOnly(anchorDateStr);
  if (isNaN(anchorDate.getTime())) return [];

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const periods: SettlementPeriod[] = [];
  let currentStart = new Date(anchorDate);

  // 若 anchor 在目標年之後，無法產生區間
  if (currentStart > yearEnd) return [];

  // 往回找到第一個在目標年之前或等於的區間起點
  while (currentStart > yearStart) {
    currentStart = addDays(currentStart, -cycleDays);
  }

  // 若 currentStart 在 yearStart 之前，調整到 yearStart 所在的區間起點
  if (currentStart < yearStart) {
    const diff = Math.ceil((yearStart.getTime() - currentStart.getTime()) / (cycleDays * 24 * 60 * 60 * 1000));
    currentStart = addDays(currentStart, diff * cycleDays);
    if (currentStart > yearEnd) return [];
  }

  // 從 currentStart 開始產生區間，直到超過 yearEnd
  while (currentStart <= yearEnd) {
    const currentEnd = addDays(currentStart, cycleDays - 1);

    // 只取與目標年有交集的區間
    const periodStart = currentStart < yearStart ? yearStart : currentStart;
    const periodEnd = currentEnd > yearEnd ? yearEnd : currentEnd;

    if (periodStart <= periodEnd) {
      periods.push({
        startDate: new Date(periodStart),
        endDate: new Date(periodEnd),
        label: `${format(periodStart, "M/d", { locale: zhTW })} - ${format(periodEnd, "M/d", { locale: zhTW })}`,
      });
    }

    currentStart = addDays(currentStart, cycleDays);
  }

  return periods.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * 取得店家的結算區間列表（指定年度）
 */
export function getSettlementPeriods(
  shop: ShopSettlementConfig,
  year: number
): SettlementPeriod[] {
  if (!shop.settlementType) return [];

  switch (shop.settlementType) {
    case "fixed_dates": {
      const dates = parseSettlementDates(shop.settlementDates);
      if (dates.length === 0) return [];
      return getFixedDatesPeriods(dates, year);
    }
    case "month_end":
      return getMonthEndPeriods(year);
    case "cycle": {
      if (!shop.settlementAnchorDate || !shop.settlementCycleDays) return [];
      const cycleDays = Math.max(1, Math.min(31, shop.settlementCycleDays));
      return getCyclePeriods(shop.settlementAnchorDate, cycleDays, year);
    }
    default:
      return [];
  }
}

/**
 * 判斷某日期是否落在結算區間內，並回傳該區間
 */
export function findSettlementPeriodForDate(
  shop: ShopSettlementConfig,
  date: Date
): SettlementPeriod | null {
  const year = date.getFullYear();
  const periods = getSettlementPeriods(shop, year);

  for (const period of periods) {
    if (isWithinInterval(date, { start: period.startDate, end: period.endDate })) {
      return period;
    }
  }

  return null;
}
