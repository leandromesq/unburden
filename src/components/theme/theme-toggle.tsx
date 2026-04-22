"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, SunMedium } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import {
  LEGACY_THEME_STORAGE_KEYS,
  matchesStorageKey,
  readStorageValue,
  THEME_STORAGE_KEY,
} from "@/lib/persistence/storage-keys";

type ThemeMode = "dark" | "light";
const themeListeners = new Set<() => void>();

function emitThemeChange() {
  themeListeners.forEach((listener) => {
    listener();
  });
}

function getThemeSnapshot(): ThemeMode {
  if (typeof document === "undefined") {
    return "dark";
  }

  if (typeof window !== "undefined") {
    const storedTheme = readStorageValue(
      THEME_STORAGE_KEY,
      LEGACY_THEME_STORAGE_KEYS,
    );
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
  }

  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(nextTheme: ThemeMode) {
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  document.body.dataset.theme = nextTheme;
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (
      !matchesStorageKey(
        event.key,
        THEME_STORAGE_KEY,
        LEGACY_THEME_STORAGE_KEYS,
      )
    ) {
      return;
    }

    listener();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function setThemePreference(nextTheme: ThemeMode) {
  applyTheme(nextTheme);
  emitThemeChange();
}

export function ThemeToggle() {
  const { dictionary } = useI18n();
  const theme = useSyncExternalStore<ThemeMode>(
    subscribeToTheme,
    getThemeSnapshot,
    () => "dark" as ThemeMode,
  );

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setThemePreference(nextTheme);
  };

  return (
    <div className="theme-toggle inline-flex rounded-full p-1">
      {(["dark", "light"] as const).map((option) => {
        const active = theme === option;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            aria-label={
              option === "dark"
                ? dictionary.themeToggle.moon
                : dictionary.themeToggle.sun
            }
            title={
              option === "dark"
                ? dictionary.themeToggle.moon
                : dictionary.themeToggle.sun
            }
            className={`theme-toggle-option flex h-8 w-8 items-center justify-center rounded-full ${
              active ? "theme-toggle-option-active" : ""
            }`}
            onClick={() => handleThemeChange(option)}
          >
            {option === "dark" ? (
              <Moon aria-hidden="true" size={15} strokeWidth={1.8} />
            ) : (
              <SunMedium aria-hidden="true" size={15} strokeWidth={1.8} />
            )}
          </button>
        );
      })}
    </div>
  );
}
