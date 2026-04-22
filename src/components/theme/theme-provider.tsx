"use client";

import { createContext, useContext } from "react";

type ThemeMode = "dark" | "light";

const ThemeInitialContext = createContext<ThemeMode>("dark");

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: ThemeMode;
}) {
  return (
    <ThemeInitialContext.Provider value={initialTheme}>
      {children}
    </ThemeInitialContext.Provider>
  );
}

export function useInitialTheme() {
  return useContext(ThemeInitialContext);
}
