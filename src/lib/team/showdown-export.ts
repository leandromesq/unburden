import { normalizeImportedSet } from "@/lib/team/imported-set-utils";
import type { ImportedSet, StatSpread } from "@/lib/types";

const SPREAD_LABELS: Array<[keyof StatSpread, string]> = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

function formatIdentityLine(set: ImportedSet) {
  const identity = set.nickname
    ? `${set.nickname} (${set.speciesName})`
    : set.speciesName;
  const gender = set.gender ? ` (${set.gender})` : "";
  const item = set.item ? ` @ ${set.item}` : "";

  return `${identity}${gender}${item}`;
}

function formatSpread(prefix: string, spread: StatSpread, predicate: (value: number) => boolean) {
  const parts = SPREAD_LABELS
    .filter(([key]) => predicate(spread[key]))
    .map(([key, label]) => `${spread[key]} ${label}`);

  return parts.length > 0 ? `${prefix}: ${parts.join(" / ")}` : null;
}

export function formatImportedSetAsShowdown(set: ImportedSet) {
  const normalized = normalizeImportedSet(set);
  const lines = [formatIdentityLine(normalized)];

  if (normalized.ability) {
    lines.push(`Ability: ${normalized.ability}`);
  }

  lines.push(`Level: ${normalized.level}`);

  if (normalized.teraType) {
    lines.push(`Tera Type: ${normalized.teraType}`);
  }

  const evLine = formatSpread("EVs", normalized.statPoints, (value) => value > 0);
  if (evLine) {
    lines.push(evLine);
  }

  lines.push(`${normalized.nature} Nature`);

  const ivLine = formatSpread("IVs", normalized.ivs, (value) => value < 31);
  if (ivLine) {
    lines.push(ivLine);
  }

  for (const move of normalized.moves) {
    lines.push(`- ${move}`);
  }

  return lines.join("\n");
}
