import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_DISPLAY_CURRENCY,
  formatAppCurrency,
} from "@/lib/money";
import type { AppLocale } from "@/i18n/config";

type ApplyPayload = { uiLocale: AppLocale; currencyCode: string };

type AppPreferencesContextValue = {
  /** 目前用於格式化的 ISO 幣別代碼 */
  currencyCode: string;
  formatMoney: (value: number) => string;
  applyFromServer: (p: ApplyPayload) => void;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null
);

function normalizeLocale(raw: string): AppLocale {
  return raw === "en" ? "en" : "zh-TW";
}

export function AppPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { i18n } = useTranslation();
  const { data: user } = trpc.auth.me.useQuery();
  const prefsQuery = trpc.userPreferences.get.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const [currencyCode, setCurrencyCode] = useState<string>(
    DEFAULT_DISPLAY_CURRENCY
  );

  const applyFromServer = useCallback(
    (p: ApplyPayload) => {
      void i18n.changeLanguage(p.uiLocale);
      setCurrencyCode(p.currencyCode);
    },
    [i18n]
  );

  useEffect(() => {
    if (!user) {
      setCurrencyCode(DEFAULT_DISPLAY_CURRENCY);
      return;
    }
    if (!prefsQuery.data) {
      return;
    }
    applyFromServer({
      uiLocale: normalizeLocale(prefsQuery.data.uiLocale),
      currencyCode: prefsQuery.data.currencyCode,
    });
  }, [user, prefsQuery.data, applyFromServer]);

  const formatMoney = useCallback(
    (value: number) => formatAppCurrency(value, i18n.language, currencyCode),
    [currencyCode, i18n.language]
  );

  const value = useMemo(
    () => ({
      currencyCode,
      formatMoney,
      applyFromServer,
    }),
    [applyFromServer, currencyCode, formatMoney]
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return ctx;
}
