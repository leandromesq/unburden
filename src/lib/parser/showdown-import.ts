import {
  DEFAULT_IV_SPREAD,
  EMPTY_STAT_SPREAD,
  cloneStatSpread,
  statPointsToCalcEvs,
} from "@/lib/calc/stat-calc";
import { formAliasMap, normalizeAlias, normalizeId, pokemonById } from "@/lib/data/loaders";
import { resolvePokemonEntity } from "@/lib/parser/fuse-indexes";
import { normalizeImportedSet } from "@/lib/team/imported-set-utils";
import type { ImportedSet, StatSpread } from "@/lib/types";

function parseFirstLine(line: string): { nickname?: string; species: string; item?: string } {
  // Try "[Nickname] (Species) @ Item" or "[Nickname] (Species)"
  const nicknameMatch = line.match(/^(.+?)\s*\(([^)]+)\)\s*(?:@\s*(.+))?$/);
  if (nicknameMatch) {
    return {
      nickname: nicknameMatch[1].trim() || undefined,
      species: nicknameMatch[2].trim(),
      item: nicknameMatch[3]?.trim() || undefined,
    };
  }

  // Try "Species @ Item"
  const atIndex = line.indexOf(" @ ");
  if (atIndex !== -1) {
    return {
      species: line.slice(0, atIndex).trim(),
      item: line.slice(atIndex + 3).trim() || undefined,
    };
  }

  return { species: line.trim() };
}

function parseStatLine(line: string): Partial<StatSpread> {
  const result: Partial<StatSpread> = {};
  const parts = line.split("/");

  for (const part of parts) {
    const match = part.trim().match(/^(\d+)\s+(.+)$/);
    if (!match) continue;

    const value = parseInt(match[1], 10);
    const statName = match[2].trim().toLowerCase();

    if (statName === "hp") result.hp = value;
    else if (statName === "atk") result.atk = value;
    else if (statName === "def") result.def = value;
    else if (statName === "spa" || statName === "sp. atk" || statName === "spatk") result.spa = value;
    else if (statName === "spd" || statName === "sp. def" || statName === "spdef") result.spd = value;
    else if (statName === "spe" || statName === "speed") result.spe = value;
  }

  return result;
}

function resolveSpeciesId(speciesName: string): { id: string; name: string } | null {
  // Direct ID lookup
  const directId = normalizeId(speciesName);
  const direct = pokemonById.get(directId);
  if (direct) return { id: direct.id, name: direct.name };

  // Form alias lookup
  const aliasId = formAliasMap.get(normalizeAlias(speciesName));
  if (aliasId) {
    const entry = pokemonById.get(aliasId);
    if (entry) return { id: entry.id, name: entry.name };
  }

  // Fuzzy match via fuse-indexes
  const fuzzy = resolvePokemonEntity(speciesName);
  if (fuzzy) return { id: fuzzy.entry.id, name: fuzzy.entry.name };

  return null;
}

function parseOneSet(block: string): ImportedSet | null {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  const firstLine = parseFirstLine(lines[0]);
  const resolved = resolveSpeciesId(firstLine.species);
  if (!resolved) return null;

  const set: ImportedSet = {
    speciesId: resolved.id,
    speciesName: resolved.name,
    nickname: firstLine.nickname,
    item: firstLine.item,
    ability: undefined,
    level: 50,
    nature: "Hardy",
    statPoints: { ...EMPTY_STAT_SPREAD },
    evs: { ...EMPTY_STAT_SPREAD },
    ivs: { ...DEFAULT_IV_SPREAD },
    moves: [],
    teraType: undefined,
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("Ability:")) {
      // Strip form name in parens, e.g. "As One (Spectrier)" → "As One"
      const rawAbility = line.slice(8).trim();
      set.ability = rawAbility.replace(/\s*\([^)]*\)\s*$/, "").trim();
      continue;
    }

    if (line.startsWith("Level:")) {
      const parsed = parseInt(line.slice(6).trim(), 10);
      if (!isNaN(parsed)) set.level = parsed;
      continue;
    }

    if (line.startsWith("Tera Type:")) {
      set.teraType = line.slice(10).trim();
      continue;
    }

    if (line.startsWith("EVs:")) {
      const parsed = parseStatLine(line.slice(4).trim());
      set.statPoints = cloneStatSpread(parsed, EMPTY_STAT_SPREAD);
      set.evs = statPointsToCalcEvs(set.statPoints);
      continue;
    }

    if (line.startsWith("SPs:")) {
      const parsed = parseStatLine(line.slice(4).trim());
      set.statPoints = cloneStatSpread(parsed, EMPTY_STAT_SPREAD);
      set.evs = statPointsToCalcEvs(set.statPoints);
      continue;
    }

    if (line.startsWith("IVs:")) {
      const parsed = parseStatLine(line.slice(4).trim());
      set.ivs = cloneStatSpread(parsed, DEFAULT_IV_SPREAD);
      continue;
    }

    // Nature line: "[Nature] Nature"
    const natureMatch = line.match(/^([A-Z][a-z]+)\s+Nature$/);
    if (natureMatch) {
      set.nature = natureMatch[1];
      continue;
    }

    // Move line: "- Move Name"
    if (line.startsWith("- ") && set.moves.length < 4) {
      const moveName = line.slice(2).trim();
      if (moveName) set.moves.push(moveName);
      continue;
    }
  }

  return normalizeImportedSet(set);
}

/**
 * Parse a PokéPaste/Showdown export string into one or more ImportedSet objects.
 * Sets are separated by one or more blank lines.
 */
export function parseShowdownSets(input: string): ImportedSet[] {
  // Split on double+ newlines to get individual set blocks
  const blocks = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const results: ImportedSet[] = [];

  for (const block of blocks) {
    const parsed = parseOneSet(block);
    if (parsed) results.push(parsed);
  }

  return results;
}
