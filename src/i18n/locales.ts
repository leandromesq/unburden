export const APP_LOCALES = ["en", "pt-BR"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = "pt-BR";
export {
  LOCALE_STORAGE_KEY,
  LEGACY_LOCALE_STORAGE_KEYS,
} from "@/lib/persistence/storage-keys";

function isAppLocale(
  value: string | null | undefined,
): value is AppLocale {
  return (
    typeof value === "string" &&
    APP_LOCALES.includes(value as AppLocale)
  );
}

export function coerceLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_APP_LOCALE;
}
