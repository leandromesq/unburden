import { create } from "zustand";

import {
  DEFAULT_IV_SPREAD,
  EMPTY_STAT_SPREAD,
  cloneStatSpread,
  evsToStatPoints,
  statPointsToCalcEvs,
} from "@/lib/calc/stat-calc";
import { normalizeImportedSet } from "@/lib/team/imported-set-utils";
import type { ImportedSet } from "@/lib/types";

const STORAGE_KEY = "omniboost-team";

function sanitizeSet(raw: unknown): ImportedSet | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.speciesId !== "string" || typeof s.speciesName !== "string")
    return null;

  return {
    ...normalizeImportedSet({
      speciesId: s.speciesId,
      speciesName: s.speciesName,
      nickname: typeof s.nickname === "string" ? s.nickname : undefined,
      gender:
        s.gender === "M" || s.gender === "F" || s.gender === "N"
          ? s.gender
          : undefined,
      item: typeof s.item === "string" ? s.item : undefined,
      ability: typeof s.ability === "string" ? s.ability : undefined,
      level: typeof s.level === "number" ? s.level : 50,
      nature: typeof s.nature === "string" ? s.nature : "Hardy",
      statPoints:
        s.statPoints && typeof s.statPoints === "object"
          ? cloneStatSpread(s.statPoints as object, EMPTY_STAT_SPREAD)
          : s.evs && typeof s.evs === "object"
            ? evsToStatPoints(cloneStatSpread(s.evs as object, EMPTY_STAT_SPREAD))
            : { ...EMPTY_STAT_SPREAD },
      evs:
        s.evs && typeof s.evs === "object"
          ? cloneStatSpread(s.evs as object, EMPTY_STAT_SPREAD)
          : s.statPoints && typeof s.statPoints === "object"
            ? statPointsToCalcEvs(cloneStatSpread(s.statPoints as object, EMPTY_STAT_SPREAD))
            : { ...EMPTY_STAT_SPREAD },
      ivs:
        s.ivs && typeof s.ivs === "object"
          ? cloneStatSpread(s.ivs as object, DEFAULT_IV_SPREAD)
          : { ...DEFAULT_IV_SPREAD },
      moves: Array.isArray(s.moves)
        ? s.moves.filter((m): m is string => typeof m === "string")
        : [],
      teraType: typeof s.teraType === "string" ? s.teraType : undefined,
    }),
  };
}

function readStorage(): Record<string, ImportedSet> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const result: Record<string, ImportedSet> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const sanitized = sanitizeSet(value);
      if (sanitized) result[key] = sanitized;
    }
    return result;
  } catch {
    return {};
  }
}

function writeStorage(sets: Record<string, ImportedSet>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch { }
}

interface TeamStore {
  localSets: Record<string, ImportedSet>;
  sharedSets: Record<string, ImportedSet>;
  importedSets: Record<string, ImportedSet>;
  hydrate: () => void;
  setSharedSets: (sets: ImportedSet[]) => void;
  clearSharedSets: () => void;
  saveSet: (set: ImportedSet) => void;
  saveSets: (sets: ImportedSet[]) => void;
  removeSet: (speciesId: string) => void;
  clearSets: () => void;
}

function mergeImportedSets(
  localSets: Record<string, ImportedSet>,
  sharedSets: Record<string, ImportedSet>,
) {
  return {
    ...localSets,
    ...sharedSets,
  };
}

function toSetMap(sets: ImportedSet[]) {
  const next: Record<string, ImportedSet> = {};

  for (const set of sets) {
    const normalized = normalizeImportedSet(set);
    next[normalized.speciesId] = normalized;
  }

  return next;
}

export const useTeamStore = create<TeamStore>()((set, get) => ({
  localSets: {},
  sharedSets: {},
  importedSets: {},

  hydrate: () => {
    const localSets = readStorage();
    set((state) => ({
      localSets,
      importedSets: mergeImportedSets(localSets, state.sharedSets),
    }));
  },

  setSharedSets: (sets) => {
    const sharedSets = toSetMap(sets);
    set((state) => ({
      sharedSets,
      importedSets: mergeImportedSets(state.localSets, sharedSets),
    }));
  },

  clearSharedSets: () => {
    set((state) => ({
      sharedSets: {},
      importedSets: mergeImportedSets(state.localSets, {}),
    }));
  },

  saveSet: (imported) => {
    const normalized = normalizeImportedSet(imported);
    const nextLocalSets = {
      ...get().localSets,
      [normalized.speciesId]: normalized,
    };
    const nextSharedSets = { ...get().sharedSets };
    delete nextSharedSets[normalized.speciesId];
    set({
      localSets: nextLocalSets,
      sharedSets: nextSharedSets,
      importedSets: mergeImportedSets(nextLocalSets, nextSharedSets),
    });
    writeStorage(nextLocalSets);
  },

  saveSets: (sets) => {
    const nextLocalSets = { ...get().localSets };
    const nextSharedSets = { ...get().sharedSets };

    for (const s of sets) {
      const normalized = normalizeImportedSet(s);
      nextLocalSets[normalized.speciesId] = normalized;
      delete nextSharedSets[normalized.speciesId];
    }

    set({
      localSets: nextLocalSets,
      sharedSets: nextSharedSets,
      importedSets: mergeImportedSets(nextLocalSets, nextSharedSets),
    });
    writeStorage(nextLocalSets);
  },

  removeSet: (speciesId) => {
    const nextLocalSets = { ...get().localSets };
    const nextSharedSets = { ...get().sharedSets };
    delete nextLocalSets[speciesId];
    delete nextSharedSets[speciesId];
    set({
      localSets: nextLocalSets,
      sharedSets: nextSharedSets,
      importedSets: mergeImportedSets(nextLocalSets, nextSharedSets),
    });
    writeStorage(nextLocalSets);
  },

  clearSets: () => {
    set({ localSets: {}, sharedSets: {}, importedSets: {} });
    writeStorage({});
  },
}));
