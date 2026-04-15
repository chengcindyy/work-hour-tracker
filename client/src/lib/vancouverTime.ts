import i18n from "@/i18n/config";
import { dateFnsLocaleForLng } from "@/i18n/dateLocale";
import { formatInTimeZone, toDate } from "date-fns-tz";

/** 業務日曆日一律以溫哥華（America/Vancouver）解讀與顯示。 */
export const APP_TIME_ZONE = "America/Vancouver";

function activeDateLocale() {
  return dateFnsLocaleForLng(i18n.language);
}

export function getCalendarPartsInZone(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = dtf.formatToParts(date);
  const y = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const m = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const d = parseInt(parts.find((p) => p.type === "day")!.value, 10);
  return { year: y, month: m, day: d };
}

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

/** 將日期選擇器選到的 `Date` 轉成溫哥華當天的 yyyy-MM-dd（送 API / 存檔）。 */
export function dateToYmdInVancouver(d: Date): string {
  return formatInTimeZone(d, APP_TIME_ZONE, "yyyy-MM-dd");
}

/** 溫哥華「今天」的 yyyy-MM-dd。 */
export function vancouverTodayYmd(): string {
  const { year, month, day } = getCalendarPartsInZone();
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function ymdFromYearMonth(year: number, month: number, day: number = 1): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function addDaysToYmd(ymd: string, deltaDays: number): string {
  const date = ymdToUtcDate(ymd);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return utcDateToYmd(date);
}

export function addMonthsToYmd(ymd: string, deltaMonths: number): string {
  const { year, month } = parseYmdParts(ymd);
  let targetYear = year;
  let targetMonth = month + deltaMonths;

  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }

  while (targetMonth < 1) {
    targetMonth += 12;
    targetYear -= 1;
  }

  return ymdFromYearMonth(targetYear, targetMonth, 1);
}

export function monthStartForYmd(ymd: string): string {
  const { year, month } = parseYmdParts(ymd);
  return ymdFromYearMonth(year, month, 1);
}

export function weekRangeForYmd(ymd: string): { startDate: string; endDate: string } {
  const weekday = ymdToUtcDate(ymd).getUTCDay();
  const startDate = addDaysToYmd(ymd, -weekday);
  return {
    startDate,
    endDate: addDaysToYmd(startDate, 6),
  };
}

/** 儲存的 workDate（yyyy-MM-dd）在溫哥華當日開始的瞬間，供格式化用。 */
export function instantForWorkDateYmd(ymd: string): Date {
  return toDate(`${ymd} 00:00:00`, { timeZone: APP_TIME_ZONE });
}

/** 卡片 / 列表：yyyy/MM/dd */
export function formatWorkDateSlash(ymd: string): string {
  if (!ymd) return "";
  return formatInTimeZone(instantForWorkDateYmd(ymd), APP_TIME_ZONE, "yyyy/MM/dd", {
    locale: activeDateLocale(),
  });
}

/** 星期幾全文，例如「星期日」 */
export function formatWorkWeekdayLong(ymd: string): string {
  if (!ymd) return "";
  return formatInTimeZone(instantForWorkDateYmd(ymd), APP_TIME_ZONE, "EEEE", {
    locale: activeDateLocale(),
  });
}

export function formatWorkWeekdayShort(ymd: string): string {
  if (!ymd) return "";
  return formatInTimeZone(instantForWorkDateYmd(ymd), APP_TIME_ZONE, "EEE", {
    locale: activeDateLocale(),
  });
}

/** 日曆元件用的 `Date`（以溫哥華該日中午錨定，避免 DST 邊界位移）。 */
export function ymdToPickerDate(ymd: string): Date {
  return toDate(`${ymd} 12:00:00`, { timeZone: APP_TIME_ZONE });
}

/** 溫哥華「本月」第一天～最後一天，供 range picker 初始值。 */
export function vancouverCurrentMonthPickerRange(): { from: Date; to: Date } {
  const { year, month } = getCalendarPartsInZone();
  return vancouverMonthPickerRangeForYearMonth(year, month);
}

export function vancouverMonthPickerRangeForYearMonth(
  year: number,
  month: number
): { from: Date; to: Date } {
  const fromYmd = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toYmd = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  return { from: ymdToPickerDate(fromYmd), to: ymdToPickerDate(toYmd) };
}

/** 以某個 yyyy-MM-dd 為基準，加減整月後該月的 picker 範圍。 */
export function vancouverMonthPickerRangeOffset(
  baseYmd: string,
  monthDelta: number
): { from: Date; to: Date } {
  const [ys, ms] = baseYmd.split("-");
  let y = parseInt(ys, 10);
  let m = parseInt(ms, 10) + monthDelta;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return vancouverMonthPickerRangeForYearMonth(y, m);
}

/** 篩選按鈕上顯示的 yyyy/MM/dd */
export function formatPickerDateSlash(d: Date): string {
  return formatInTimeZone(d, APP_TIME_ZONE, "yyyy/MM/dd", { locale: activeDateLocale() });
}
