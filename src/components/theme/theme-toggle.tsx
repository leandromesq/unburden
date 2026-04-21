"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, SunMedium } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";

type ThemeMode = "dark" | "light";

const STORAGE_KEY = "omniboost-theme";
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
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
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
  window.localStorage.setItem(STORAGE_KEY, nextTheme);
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
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
