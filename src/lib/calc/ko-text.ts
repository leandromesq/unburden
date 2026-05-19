export interface DamageOutcomeLabels {
  guaranteedOhko: string;
  ohkoRoll: string;
  guaranteedTwoHitPace: string;
  twoHitRoll: string;
  comfortableSurvive: string;
  chipDamage: string;
}

export function getDamageOutcomeLabel(
  minPercentage: number,
  maxPercentage: number,
  koChanceText: string,
  labels: DamageOutcomeLabels,
) {
  const normalizedKo = koChanceText.trim().toLowerCase();

  if (minPercentage >= 100) return labels.guaranteedOhko;
  if (maxPercentage >= 100 && !normalizedKo.startsWith("0%")) return labels.ohkoRoll;
  if (minPercentage >= 50) return labels.guaranteedTwoHitPace;
  if (maxPercentage >= 50) return labels.twoHitRoll;
  if (maxPercentage < 25) return labels.comfortableSurvive;

  return labels.chipDamage;
}

export function normalizeKoText(value: string | undefined) {
  if (!value) {
    return "KO chance unavailable";
  }

  return value
    .trim()
    .replace(/^guaranteed/i, "Guaranteed")
    .replace(/\bpossible\b/i, "Possible")
    .replace(/\bohko\b/gi, "OHKO")
    .replace(/\b(\d+)hko\b/gi, "$1HKO");
}

export function koTextTone(value: string) {
  if (/OHKO/i.test(value)) {
    return "theme-ko-strong";
  }

  if (/2HKO/i.test(value)) {
    return "theme-ko-medium";
  }

  if (/[3-9]HKO/i.test(value)) {
    return "theme-ko-soft";
  }

  return "theme-text-dim";
}
