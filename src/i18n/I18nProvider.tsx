"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

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
  locale: DEFAULT_APP_LOCALE,
  dictionary: getDictionary(DEFAULT_APP_LOCALE),
  setLocale: () => {},
});

const localeListeners = new Set<() => void>();

function emitLocaleChange() {
  localeListeners.forEach((listener) => {
    listener();
  });
}

function syncLocale(locale: AppLocale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}

function readLocaleSnapshot(fallbackLocale: AppLocale): AppLocale {
  if (typeof document === "undefined") {
    return fallbackLocale;
  }

  return coerceLocale(
    window.localStorage.getItem(LOCALE_STORAGE_KEY) ??
      document.documentElement.lang,
  );
}

function subscribeToLocale(listener: () => void) {
  localeListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== LOCALE_STORAGE_KEY) {
      return;
    }

    listener();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    localeListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function setLocalePreference(nextLocale: AppLocale) {
  syncLocale(nextLocale);
  emitLocaleChange();
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_APP_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: AppLocale;
}) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    () => readLocaleSnapshot(initialLocale),
    () => initialLocale,
  );

  useLayoutEffect(() => {
    syncLocale(locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      dictionary: getDictionary(locale),
      setLocale: setLocalePreference,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
