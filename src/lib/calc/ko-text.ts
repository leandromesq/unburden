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
    return "text-emerald-400";
  }

  if (/2HKO/i.test(value)) {
    return "text-amber-300";
  }

  if (/[3-9]HKO/i.test(value)) {
    return "text-rose-300";
  }

  return "text-zinc-400";
}
