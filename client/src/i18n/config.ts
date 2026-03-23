import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";

export const LOCALE_STORAGE_KEY = "workhour-locale";
export const SUPPORTED_LOCALES = ["zh-TW", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "zh-TW";
  }
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === "en" || raw === "zh-TW") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "zh-TW";
}

function applyDocumentLang(lng: string) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.lang = lng === "en" ? "en" : "zh-Hant";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-TW": { translation: zhTW },
  },
  lng: readStoredLocale(),
  fallbackLng: "zh-TW",
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

applyDocumentLang(i18n.language);

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  applyDocumentLang(lng);
});

export default i18n;
