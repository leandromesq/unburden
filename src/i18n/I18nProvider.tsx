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
  LEGACY_LOCALE_STORAGE_KEYS,
  LOCALE_STORAGE_KEY,
  type AppLocale,
} from "@/i18n/locales";
import {
  matchesStorageKey,
  readStorageValue,
  LOCALE_COOKIE_KEY,
  writeClientPreferenceCookie,
} from "@/lib/persistence/storage-keys";
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
    writeClientPreferenceCookie(LOCALE_COOKIE_KEY, locale);
  }
}

function readLocaleSnapshot(fallbackLocale: AppLocale): AppLocale {
  if (typeof document === "undefined") {
    return fallbackLocale;
  }

  return coerceLocale(
    readStorageValue(LOCALE_STORAGE_KEY, LEGACY_LOCALE_STORAGE_KEYS) ??
      document.documentElement.lang,
  );
}

function readHydrationLocaleSnapshot(fallbackLocale: AppLocale): AppLocale {
  if (typeof window === "undefined") {
    return fallbackLocale;
  }

  return readLocaleSnapshot(fallbackLocale);
}

function subscribeToLocale(listener: () => void) {
  localeListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (
      !matchesStorageKey(
        event.key,
        LOCALE_STORAGE_KEY,
        LEGACY_LOCALE_STORAGE_KEYS,
      )
    ) {
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
    () => readHydrationLocaleSnapshot(initialLocale),
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
