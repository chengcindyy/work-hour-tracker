export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/** 帳號偏好：介面語言（與 i18n 代碼一致） */
export const USER_PREFERENCE_UI_LOCALES = ["zh-TW", "en"] as const;
export type UserPreferenceUiLocale = (typeof USER_PREFERENCE_UI_LOCALES)[number];

/** 帳號偏好：顯示幣別（ISO 4217，不做匯率換算） */
export const USER_PREFERENCE_CURRENCIES = ["CAD", "TWD", "USD"] as const;
export type UserPreferenceCurrency = (typeof USER_PREFERENCE_CURRENCIES)[number];

export const DEFAULT_USER_PREFERENCE_UI_LOCALE: UserPreferenceUiLocale = "zh-TW";
export const DEFAULT_USER_PREFERENCE_CURRENCY: UserPreferenceCurrency = "CAD";
