import { create } from "zustand";

import type { ImportedSet } from "@/lib/types";

const STORAGE_KEY = "omniboost-team";

const DEFAULT_STAT_SPREAD = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const DEFAULT_IV_SPREAD = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
};

function sanitizeSet(raw: unknown): ImportedSet | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.speciesId !== "string" || typeof s.speciesName !== "string")
    return null;

  return {
    speciesId: s.speciesId,
    speciesName: s.speciesName,
    nickname: typeof s.nickname === "string" ? s.nickname : undefined,
    item: typeof s.item === "string" ? s.item : undefined,
    ability: typeof s.ability === "string" ? s.ability : undefined,
    level: typeof s.level === "number" ? s.level : 50,
    nature: typeof s.nature === "string" ? s.nature : "Hardy",
    evs:
      s.evs && typeof s.evs === "object"
        ? { ...DEFAULT_STAT_SPREAD, ...(s.evs as object) }
        : { ...DEFAULT_STAT_SPREAD },
    ivs:
      s.ivs && typeof s.ivs === "object"
        ? { ...DEFAULT_IV_SPREAD, ...(s.ivs as object) }
        : { ...DEFAULT_IV_SPREAD },
    moves: Array.isArray(s.moves)
      ? s.moves.filter((m): m is string => typeof m === "string")
      : [],
    teraType: typeof s.teraType === "string" ? s.teraType : undefined,
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
  } catch {}
}

interface TeamStore {
  importedSets: Record<string, ImportedSet>;
  hydrate: () => void;
  saveSet: (set: ImportedSet) => void;
  saveSets: (sets: ImportedSet[]) => void;
  removeSet: (speciesId: string) => void;
  clearSets: () => void;
}

export const useTeamStore = create<TeamStore>()((set, get) => ({
  importedSets: {},

  hydrate: () => {
    set({ importedSets: readStorage() });
  },

  saveSet: (imported) => {
    const next = { ...get().importedSets, [imported.speciesId]: imported };
    set({ importedSets: next });
    writeStorage(next);
  },

  saveSets: (sets) => {
    const next = { ...get().importedSets };
    for (const s of sets) {
      next[s.speciesId] = s;
    }
    set({ importedSets: next });
    writeStorage(next);
  },

  removeSet: (speciesId) => {
    const next = { ...get().importedSets };
    delete next[speciesId];
    set({ importedSets: next });
    writeStorage(next);
  },

  clearSets: () => {
    set({ importedSets: {} });
    writeStorage({});
  },
}));
