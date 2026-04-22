export const THEME_STORAGE_KEY = "unburden-theme";
export const LEGACY_THEME_STORAGE_KEYS = ["omniboost-theme"] as const;
export const THEME_COOKIE_KEY = "unburden-theme";

export const LOCALE_STORAGE_KEY = "unburden-locale";
export const LEGACY_LOCALE_STORAGE_KEYS = ["omniboost-locale"] as const;
export const LOCALE_COOKIE_KEY = "unburden-locale";

export const TEAM_STORAGE_KEY = "unburden-team";
export const LEGACY_TEAM_STORAGE_KEYS = ["omniboost-team"] as const;

export function readStorageValue(
  primaryKey: string,
  legacyKeys: readonly string[] = [],
) {
  if (typeof window === "undefined") {
    return null;
  }

  const primaryValue = window.localStorage.getItem(primaryKey);
  if (primaryValue !== null) {
    return primaryValue;
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = window.localStorage.getItem(legacyKey);
    if (legacyValue === null) {
      continue;
    }

    window.localStorage.setItem(primaryKey, legacyValue);
    window.localStorage.removeItem(legacyKey);
    return legacyValue;
  }

  return null;
}

export function matchesStorageKey(
  candidateKey: string | null,
  primaryKey: string,
  legacyKeys: readonly string[] = [],
) {
  return candidateKey === primaryKey || legacyKeys.includes(candidateKey ?? "");
}

export function writeClientPreferenceCookie(
  key: string,
  value: string,
  maxAge = 60 * 60 * 24 * 365,
) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}
