import { normalizeImportedSet } from "@/lib/team/imported-set-utils";
import type {
  ImportedSet,
  ShareState,
  SpeedBenchmarkShareState,
  SpeedGlobalState,
  SpeedSideState,
} from "@/lib/types";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isSpeedGlobalsLike(value: unknown): value is SpeedGlobalState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return [
    "sun",
    "rain",
    "sand",
    "snow",
    "electricTerrain",
    "trickRoom",
  ].every((key) => typeof candidate[key] === "boolean");
}

function isSpeedSideLike(value: unknown): value is SpeedSideState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.source === "string" &&
    typeof candidate.speciesId === "string" &&
    Array.isArray(candidate.abilityActiveStates) &&
    ["plus", "neutral", "minus"].includes(String(candidate.nature)) &&
    typeof candidate.speSp === "number" &&
    typeof candidate.speedStage === "number" &&
    typeof candidate.tailwind === "boolean" &&
    typeof candidate.paralysis === "boolean" &&
    Array.isArray(candidate.overrides)
  );
}

function isSpeedShareStateLike(value: unknown): value is SpeedBenchmarkShareState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.command === "string" &&
    (candidate.subject === null || isSpeedSideLike(candidate.subject)) &&
    (candidate.comparator === null || isSpeedSideLike(candidate.comparator)) &&
    isSpeedGlobalsLike(candidate.globals) &&
    (candidate.focusedTierSpeed === null ||
      typeof candidate.focusedTierSpeed === "number")
  );
}

function parseRawShareState(encoded: string | null): ShareState | null {
  if (!encoded) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(encoded)) as ShareState;
  } catch {
    return null;
  }
}

function isImportedSetLike(value: unknown): value is ImportedSet {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.speciesId === "string" &&
    typeof candidate.speciesName === "string"
  );
}

export function parseShareState(encoded: string | null) {
  if (!encoded) {
    return [];
  }

  try {
    const parsed = parseRawShareState(encoded);

    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.sets)) {
      return [];
    }

    return parsed.sets
      .filter(isImportedSetLike)
      .map((set) => normalizeImportedSet(set));
  } catch {
    return [];
  }
}

export function parseSpeedShareState(encoded: string | null) {
  const parsed = parseRawShareState(encoded);

  if (!parsed || parsed.v !== 2 || parsed.page !== "speed") {
    return null;
  }

  return isSpeedShareStateLike(parsed.state) ? parsed.state : null;
}
