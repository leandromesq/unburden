import {
  DEFAULT_IV_SPREAD,
  EMPTY_STAT_SPREAD,
  cloneStatSpread,
  clampStatPoints,
  evsToStatPoints,
  statPointsToCalcEvs,
} from "@/lib/calc/stat-calc";
import type { ImportedSet, PokemonEntry, StatSpread } from "@/lib/types";

export function resolveImportedSet(
  pokemon: PokemonEntry,
  importedSets: Record<string, ImportedSet>,
): ImportedSet | null {
  return (
    importedSets[pokemon.id] ??
    (pokemon.baseSpeciesId ? importedSets[pokemon.baseSpeciesId] : null) ??
    null
  );
}

export function normalizeImportedSet(set: ImportedSet): ImportedSet {
  const statPoints = clampStatPoints(
    cloneStatSpread(
      set.statPoints,
      set.evs ? evsToStatPoints(set.evs) : EMPTY_STAT_SPREAD,
    ),
  );

  return {
    ...set,
    statPoints,
    evs: cloneStatSpread(set.evs, statPointsToCalcEvs(statPoints)),
    ivs: cloneStatSpread(set.ivs, DEFAULT_IV_SPREAD),
    moves: [...set.moves].slice(0, 4),
  };
}

export function createImportedSet(options: {
  speciesId: string;
  speciesName: string;
  nickname?: string;
  item?: string;
  ability?: string;
  level?: number;
  nature?: string;
  statPoints?: Partial<StatSpread>;
  ivs?: Partial<StatSpread>;
  moves?: string[];
  teraType?: string;
}): ImportedSet {
  const statPoints = clampStatPoints(
    cloneStatSpread(options.statPoints, EMPTY_STAT_SPREAD),
  );

  return normalizeImportedSet({
    speciesId: options.speciesId,
    speciesName: options.speciesName,
    nickname: options.nickname,
    item: options.item,
    ability: options.ability,
    level: options.level ?? 50,
    nature: options.nature ?? "Hardy",
    statPoints,
    evs: statPointsToCalcEvs(statPoints),
    ivs: cloneStatSpread(options.ivs, DEFAULT_IV_SPREAD),
    moves: options.moves ?? [],
    teraType: options.teraType,
  });
}
