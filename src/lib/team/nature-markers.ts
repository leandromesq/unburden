import type { StatSpread } from "@/lib/types";

export type NatureMarker = "+" | "-";
export type NatureMarkerState = Partial<
  Record<keyof Omit<StatSpread, "hp">, NatureMarker>
>;
export type StatInputDrafts = Record<keyof StatSpread, string>;

const NATURE_BY_MARKERS: Record<string, string> = {
  "atk:def": "Lonely",
  "atk:spe": "Brave",
  "atk:spa": "Adamant",
  "atk:spd": "Naughty",
  "def:atk": "Bold",
  "def:spe": "Relaxed",
  "def:spa": "Impish",
  "def:spd": "Lax",
  "spe:atk": "Timid",
  "spe:def": "Hasty",
  "spe:spa": "Jolly",
  "spe:spd": "Naive",
  "spa:atk": "Modest",
  "spa:def": "Mild",
  "spa:spe": "Quiet",
  "spa:spd": "Rash",
  "spd:atk": "Calm",
  "spd:def": "Gentle",
  "spd:spe": "Sassy",
  "spd:spa": "Careful",
};

const NEUTRAL_NATURE = "Hardy";

const NON_HP_STATS: Array<keyof Omit<StatSpread, "hp">> = [
  "atk",
  "def",
  "spa",
  "spd",
  "spe",
];

export interface ParsedStatInputDraft {
  numericValue: number | null;
  marker: NatureMarker | null;
  isEmpty: boolean;
  isValid: boolean;
}

export function getNeutralNature() {
  return NEUTRAL_NATURE;
}

export function getNatureByMarkers() {
  return NATURE_BY_MARKERS;
}

export function getNatureMarkers(nature: string): NatureMarkerState {
  const normalizedNature = nature.trim();
  const entry = Object.entries(NATURE_BY_MARKERS).find(
    ([, mappedNature]) => mappedNature === normalizedNature,
  );

  if (!entry) {
    return {};
  }

  const [pair] = entry;
  const [boosted, lowered] = pair.split(":") as Array<
    keyof Omit<StatSpread, "hp">
  >;

  return {
    [boosted]: "+",
    [lowered]: "-",
  };
}

export function buildNatureMarkerState(nature: string): NatureMarkerState {
  return getNatureMarkers(nature);
}

export function resolveNatureFromMarkerState(
  markerState: NatureMarkerState,
): string {
  const boosted = NON_HP_STATS.find((stat) => markerState[stat] === "+");
  const lowered = NON_HP_STATS.find((stat) => markerState[stat] === "-");

  if (!boosted && !lowered) {
    return NEUTRAL_NATURE;
  }

  if (!boosted || !lowered) {
    return NEUTRAL_NATURE;
  }

  return NATURE_BY_MARKERS[`${boosted}:${lowered}`] ?? NEUTRAL_NATURE;
}

export function buildStatInputDraft(
  value: number,
  marker?: NatureMarker | null,
): string {
  const normalizedValue = Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
  return `${normalizedValue}${marker ?? ""}`;
}

export function buildStatInputDrafts(
  statPoints: StatSpread,
  markerState: NatureMarkerState = {},
): StatInputDrafts {
  return {
    hp: String(statPoints.hp),
    atk: buildStatInputDraft(statPoints.atk, markerState.atk),
    def: buildStatInputDraft(statPoints.def, markerState.def),
    spa: buildStatInputDraft(statPoints.spa, markerState.spa),
    spd: buildStatInputDraft(statPoints.spd, markerState.spd),
    spe: buildStatInputDraft(statPoints.spe, markerState.spe),
  };
}

export function parseStatInputDraft(rawValue: string): ParsedStatInputDraft {
  const trimmed = rawValue.trim();

  if (trimmed === "") {
    return {
      numericValue: null,
      marker: null,
      isEmpty: true,
      isValid: true,
    };
  }

  const markerMatch = trimmed.match(/[+-]$/);
  const marker = (markerMatch?.[0] as NatureMarker | undefined) ?? null;
  const numericPart = marker ? trimmed.slice(0, -1).trim() : trimmed;

  if (numericPart === "" && marker) {
    return {
      numericValue: 0,
      marker,
      isEmpty: false,
      isValid: true,
    };
  }

  if (!/^\d+$/.test(numericPart)) {
    return {
      numericValue: null,
      marker,
      isEmpty: false,
      isValid: false,
    };
  }

  return {
    numericValue: Number(numericPart),
    marker,
    isEmpty: false,
    isValid: true,
  };
}

export function applyMarkerToState(
  currentState: NatureMarkerState,
  stat: keyof StatSpread,
  marker: NatureMarker | null,
): NatureMarkerState {
  if (stat === "hp") {
    return currentState;
  }

  const nextState: NatureMarkerState = { ...currentState };
  const typedStat = stat as keyof Omit<StatSpread, "hp">;

  delete nextState[typedStat];

  if (!marker) {
    return nextState;
  }

  for (const key of NON_HP_STATS) {
    if (key !== typedStat && nextState[key] === marker) {
      delete nextState[key];
    }
  }

  nextState[typedStat] = marker;
  return nextState;
}

export function clearMarkerFromState(
  currentState: NatureMarkerState,
  stat: keyof StatSpread,
): NatureMarkerState {
  if (stat === "hp") {
    return currentState;
  }

  const nextState: NatureMarkerState = { ...currentState };
  delete nextState[stat as keyof Omit<StatSpread, "hp">];
  return nextState;
}
