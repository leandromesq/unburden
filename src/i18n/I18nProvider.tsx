"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getDictionary } from "@/i18n/messages";
import {
  coerceLocale,
  DEFAULT_APP_LOCALE,
  LOCALE_STORAGE_KEY,
  type AppLocale,
} from "@/i18n/locales";
import type { AppDictionary } from "@/i18n/types";

interface I18nContextValue {
  locale: AppLocale;
  dictionary: AppDictionary;
  setLocale: (locale: AppLocale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  dictionary: getDictionary("en"),
  setLocale: () => {},
});

function getInitialLocale(initialLocale: AppLocale): AppLocale {
  if (typeof document === "undefined") {
    return initialLocale;
  }

  return coerceLocale(
    window.localStorage.getItem(LOCALE_STORAGE_KEY) ??
      document.documentElement.lang,
  );
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_APP_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: AppLocale;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    getInitialLocale(initialLocale),
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LOCALE_STORAGE_KEY) {
        return;
      }

      setLocaleState(coerceLocale(event.newValue));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      dictionary: getDictionary(locale),
      setLocale: setLocaleState,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
