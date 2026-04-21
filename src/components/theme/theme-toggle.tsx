"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";

type ThemeMode = "dark" | "light";

const STORAGE_KEY = "omniboost-theme";

function getThemeSnapshot(): ThemeMode {
  if (typeof document === "undefined") {
    return "dark";
  }

  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(nextTheme: ThemeMode) {
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  document.body.dataset.theme = nextTheme;
  window.localStorage.setItem(STORAGE_KEY, nextTheme);
}

export function ThemeToggle() {
  const { dictionary } = useI18n();
  const [theme, setTheme] = useState<ThemeMode>(getThemeSnapshot);

  useEffect(() => {
    const syncTheme = () => {
      setTheme(getThemeSnapshot());
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const handleThemeChange = (nextTheme: ThemeMode) => {
    applyTheme(nextTheme);
    setTheme(nextTheme);
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
