import {
  DEFAULT_USER_PREFERENCE_CURRENCY,
  USER_PREFERENCE_CURRENCIES,
} from "@shared/const";

export const SUPPORTED_DISPLAY_CURRENCIES = USER_PREFERENCE_CURRENCIES;
export const DEFAULT_DISPLAY_CURRENCY = DEFAULT_USER_PREFERENCE_CURRENCY;

/**
 * 依介面語系與帳號偏好幣別格式化金額（不做匯率換算）。
 * 英文介面用 en-CA locale 數字格式，其餘用 zh-TW。
 */
export function formatAppCurrency(
  value: number,
  i18nLanguage: string,
  currencyCode: string
): string {
  const loc =
    i18nLanguage === "en" || i18nLanguage.startsWith("en-") ? "en-CA" : "zh-TW";
  const code = (USER_PREFERENCE_CURRENCIES as readonly string[]).includes(
    currencyCode
  )
    ? currencyCode
    : DEFAULT_USER_PREFERENCE_CURRENCY;
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
