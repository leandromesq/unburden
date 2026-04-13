"use client";

import { useEffect, useState } from "react";

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
            className={`theme-toggle-option rounded-full px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.16em] ${
              active ? "theme-toggle-option-active" : ""
            }`}
            onClick={() => handleThemeChange(option)}
          >
            {option === "dark" ? "Dark" : "Light"}
          </button>
        );
      })}
    </div>
  );
}
