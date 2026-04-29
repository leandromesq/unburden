export function getCssDurationMs(variableName: string, fallbackMs: number) {
  if (typeof window === "undefined") {
    return fallbackMs;
  }

  const rawValue = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  const numericValue = Number.parseFloat(rawValue);

  if (!Number.isFinite(numericValue)) {
    return fallbackMs;
  }

  return rawValue.endsWith("ms") ? numericValue : numericValue * 1000;
}
