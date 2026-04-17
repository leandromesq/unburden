import { useMemo } from "react";

import {
  itemDisplayById,
  moveById,
  normalizeAlias,
  normalizeId,
  pokemonById,
  resolveMegaEvolution,
} from "@/lib/data/loaders";
import {
  DEFAULT_IV_SPREAD,
  EMPTY_STAT_SPREAD,
  computeStats,
  statPointsToCalcEvs,
} from "@/lib/calc/stat-calc";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import {
  ATTACKER_MODIFIER_MAP,
  DEFENDER_MODIFIER_MAP,
  buildCommonAbilities,
} from "@/lib/parser/grammar";
import { resolveMoveEntity } from "@/lib/parser/fuse-indexes";
import { inferDefaultAbility } from "@/lib/parser/inference";
import {
  resolveReferencedImportedSet,
  resolveSetReferenceToken,
} from "@/lib/team/set-references";
import type {
  ImportedSet,
  ParsedCommand,
  PokemonEntry,
  StatSpread,
} from "@/lib/types";

type SummarySide = "attacker" | "defender";
type StatKey = keyof StatSpread;

const STAT_LABELS: Array<[StatKey, string]> = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

interface ItemStatBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface PokemonSummaryData {
  title: "Attacker" | "Defender";
  name: string;
  pokemonId: string;
  promptPokemonId: string;
  spriteSources: string[];
  ability: string | null;
  move: string | null;
  activeMoveEntry:
    | (typeof moveById extends Map<string, infer T> ? T : never)
    | null;
  item: string | null;
  nature: string;
  stats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  isBaseStats: boolean;
  importedSet: ImportedSet | null;
  promptStatPoints: StatSpread | undefined;
  effectiveStatPoints: StatSpread;
  megaTarget: PokemonEntry | null;
  stageBoosts: StatSpread;
  itemBoosts: ItemStatBoosts;
}

interface UsePokemonSummaryOptions {
  side: SummarySide;
  commandStructure: ReturnType<typeof analyzeCommandStructure>;
  parsedCommand: ParsedCommand | null;
  importedSets: Record<string, ImportedSet>;
  pendingStatPoints: StatSpread | null;
}

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
  importedSets: Record<string, ImportedSet>,
): PokemonEntry | null {
  const referenceSet = resolveSetReferenceToken(
    segment.leadingFreeTokens[0]?.raw,
    importedSets,
  );

  if (referenceSet && segment.leadingFreeTokens.length === 1) {
    return pokemonById.get(normalizeId(referenceSet.speciesId)) ?? null;
  }

  if (segment.speciesExact) {
    return segment.speciesExact.entry;
  }

  if (segment.leadingRemainderTokens.length === 0) {
    return segment.speciesMatch?.entry ?? null;
  }

  return null;
}

function resolveImportedSetByRelatedForm(
  pokemon: PokemonEntry | null,
  importedSets: Record<string, ImportedSet>,
): ImportedSet | null {
  if (!pokemon) {
    return null;
  }

  const direct = importedSets[normalizeId(pokemon.id)];
  if (direct) {
    return direct;
  }

  if (pokemon.baseSpeciesId) {
    const baseSet = importedSets[normalizeId(pokemon.baseSpeciesId)];
    if (baseSet) {
      return baseSet;
    }
  }

  for (const set of Object.values(importedSets)) {
    const setSpecies = pokemonById.get(normalizeId(set.speciesId));
    if (!setSpecies) {
      continue;
    }

    const setMega = resolveMegaEvolution(setSpecies.id, set.item);
    if (setMega?.id === pokemon.id) {
      return set;
    }
  }

  return null;
}

function resolveMoveName(moveInput: string | undefined): string | null {
  if (!moveInput) {
    return null;
  }

  const exact = moveById.get(normalizeId(moveInput));
  if (exact) {
    return exact.name;
  }

  return resolveMoveEntity(moveInput.replace(/-/g, " "))?.entry.name ?? null;
}

function resolveAbilityDisplay(
  pokemon: PokemonEntry | null,
  explicitAbility: string | undefined,
): string | null {
  if (!pokemon) {
    return null;
  }

  if (explicitAbility) {
    const knownAbilities = buildCommonAbilities(undefined, pokemon.abilities);
    const normalized = normalizeAlias(explicitAbility);

    return (
      knownAbilities.find(
        (ability) => normalizeAlias(ability) === normalized,
      ) ?? explicitAbility
    );
  }

  return inferDefaultAbility(pokemon.id);
}

function getStageValue(
  tokens: ReturnType<
    typeof analyzeCommandStructure
  >["attacker"]["modifierTokens"],
  map: typeof ATTACKER_MODIFIER_MAP,
  kind: "stat_mod" | "speed_mod",
): number {
  return Math.max(
    -6,
    Math.min(
      6,
      tokens.reduce((sum, token) => {
        const definition = map.get(token.value);
        return definition?.kind === kind
          ? sum + (definition.statMod ?? 0)
          : sum;
      }, 0),
    ),
  );
}

function getItemStatBoosts(
  itemName: string | null | undefined,
): ItemStatBoosts {
  if (!itemName) {
    return { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
  }

  const id = normalizeId(itemName);

  if (id === "choiceband") {
    return { atk: 1.5, def: 1, spa: 1, spd: 1, spe: 1 };
  }

  if (id === "choicespecs") {
    return { atk: 1, def: 1, spa: 1.5, spd: 1, spe: 1 };
  }

  if (id === "choicescarf") {
    return { atk: 1, def: 1, spa: 1, spd: 1, spe: 1.5 };
  }

  if (id === "assaultvest") {
    return { atk: 1, def: 1, spa: 1, spd: 1.5, spe: 1 };
  }

  return { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
}

function buildEffectiveSetPreview(
  importedSet: ImportedSet | null,
  statPoints: StatSpread | undefined,
  nature: string | undefined,
) {
  const effectiveStatPoints =
    statPoints ?? importedSet?.statPoints ?? EMPTY_STAT_SPREAD;
  const effectiveNature = nature ?? importedSet?.nature ?? "Hardy";

  return {
    statPoints: effectiveStatPoints,
    evs: statPointsToCalcEvs(effectiveStatPoints),
    ivs: { ...DEFAULT_IV_SPREAD },
    nature: effectiveNature,
  };
}

function getPokemonSpriteSources(pokemon: PokemonEntry) {
  const slugs = [pokemon.name, ...pokemon.aliases, pokemon.id]
    .map((value) =>
      value
        .toLowerCase()
        .replace(/['.:]/g, "")
        .replace(/♀/g, "-f")
        .replace(/♂/g, "-m")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean);

  return Array.from(
    new Set(
      slugs.flatMap((slug) => [
        slug,
        slug.replace(/-mega-x$/i, "-megax"),
        slug.replace(/-mega-y$/i, "-megay"),
        slug.replace(/-rapid-strike$/i, "-rapidstrike"),
        slug.replace(/-single-strike$/i, "-singlestrike"),
        slug.replace(/-paldea-combat$/i, "-paldeacombat"),
        slug.replace(/-paldea-blaze$/i, "-paldeablaze"),
        slug.replace(/-paldea-aqua$/i, "-paldeaaqua"),
        slug.replace(/-blood-moon$/i, "-bloodmoon"),
        normalizeId(slug),
      ]),
    ),
  ).flatMap((slug) => [
    `https://play.pokemonshowdown.com/sprites/home/${slug}.png`,
    `https://play.pokemonshowdown.com/sprites/dex/${slug}.png`,
    `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`,
    `https://img.pokemondb.net/sprites/home/normal/${slug}.png`,
    `https://img.pokemondb.net/artwork/large/${slug}.jpg`,
  ]);
}

export function usePokemonSummary({
  side,
  commandStructure,
  parsedCommand,
  importedSets,
  pendingStatPoints,
}: UsePokemonSummaryOptions): PokemonSummaryData | null {
  return useMemo(() => {
    const structure = commandStructure;

    const attackerPromptSpecies = resolveParsedSpecies(
      structure.attacker,
      importedSets,
    );
    const defenderPromptSpecies = resolveParsedSpecies(
      structure.defender,
      importedSets,
    );

    const attackerReferenceSet = resolveSetReferenceToken(
      structure.attacker.leadingFreeTokens[0]?.raw,
      importedSets,
    );
    const defenderReferenceSet = resolveSetReferenceToken(
      structure.defender.leadingFreeTokens[0]?.raw,
      importedSets,
    );

    const attackerImportedSet =
      resolveReferencedImportedSet(
        parsedCommand?.attackerSetReferenceId,
        importedSets,
      ) ??
      attackerReferenceSet ??
      resolveImportedSetByRelatedForm(attackerPromptSpecies, importedSets);

    const defenderImportedSet =
      resolveReferencedImportedSet(
        parsedCommand?.defenderSetReferenceId,
        importedSets,
      ) ??
      defenderReferenceSet ??
      resolveImportedSetByRelatedForm(defenderPromptSpecies, importedSets);

    const promptStatPoints =
      side === "attacker"
        ? parsedCommand?.attackerStatPoints
        : parsedCommand?.defenderStatPoints;

    const effectivePromptStatPoints =
      promptStatPoints &&
      pendingStatPoints &&
      STAT_LABELS.every(
        ([key]) => promptStatPoints[key] === pendingStatPoints[key],
      )
        ? promptStatPoints
        : (pendingStatPoints ?? promptStatPoints);

    const attackerStatStage = getStageValue(
      structure.attacker.modifierTokens,
      ATTACKER_MODIFIER_MAP,
      "stat_mod",
    );
    const attackerSpeedStage = getStageValue(
      structure.attacker.modifierTokens,
      ATTACKER_MODIFIER_MAP,
      "speed_mod",
    );
    const defenderStatStage = getStageValue(
      structure.defender.modifierTokens,
      DEFENDER_MODIFIER_MAP,
      "stat_mod",
    );
    const defenderSpeedStage = getStageValue(
      structure.defender.modifierTokens,
      DEFENDER_MODIFIER_MAP,
      "speed_mod",
    );

    const moveSlug = structure.attacker.moveToken?.value;
    const moveName = resolveMoveName(moveSlug);
    const moveEntry = moveSlug
      ? (moveById.get(normalizeId(moveSlug)) ??
        resolveMoveEntity(moveSlug.replace(/-/g, " "))?.entry ??
        null)
      : null;
    const moveCategory = moveEntry?.category ?? null;

    const attackerItemDisplay = structure.attacker.itemToken?.value
      ? (itemDisplayById.get(normalizeId(structure.attacker.itemToken.value)) ??
        structure.attacker.itemToken.value)
      : null;
    const defenderItemDisplay = structure.defender.itemToken?.value
      ? (itemDisplayById.get(normalizeId(structure.defender.itemToken.value)) ??
        structure.defender.itemToken.value)
      : null;

    const attackerItemName =
      parsedCommand?.attackerItem ??
      attackerItemDisplay ??
      attackerImportedSet?.item ??
      null;
    const defenderItemName =
      parsedCommand?.defenderItem ??
      defenderItemDisplay ??
      defenderImportedSet?.item ??
      null;

    if (side === "attacker") {
      const attacker = attackerPromptSpecies;
      if (!attacker) {
        return null;
      }

      const importedSet = attackerImportedSet;
      const effectiveSet = buildEffectiveSetPreview(
        importedSet,
        effectivePromptStatPoints,
        parsedCommand?.attackerNature,
      );
      const hasCustomStats = Boolean(importedSet || effectivePromptStatPoints);
      const stats = hasCustomStats
        ? computeStats(
            attacker.baseStats,
            effectiveSet.evs,
            effectiveSet.ivs,
            effectiveSet.nature,
            importedSet?.level ?? 50,
          )
        : attacker.baseStats;

      const atkStage = moveCategory === "Special" ? 0 : attackerStatStage;
      const spaStage = moveCategory === "Physical" ? 0 : attackerStatStage;
      const attackerChoiceBoosts = getItemStatBoosts(attackerItemName);
      const megaTarget = attacker.isMega
        ? attacker.baseSpeciesId
          ? (pokemonById.get(attacker.baseSpeciesId) ?? null)
          : null
        : resolveMegaEvolution(attacker.id, attackerItemName ?? undefined);

      return {
        title: "Attacker",
        name: attacker.name,
        pokemonId: attacker.id,
        promptPokemonId: attackerPromptSpecies?.id ?? attacker.id,
        spriteSources: getPokemonSpriteSources(attacker),
        ability: resolveAbilityDisplay(
          attacker,
          parsedCommand?.attackerAbility ??
            structure.attacker.abilityToken?.value,
        ),
        move: parsedCommand?.move ?? moveName,
        activeMoveEntry: moveEntry,
        item: attackerItemName,
        nature: effectiveSet.nature,
        stats,
        isBaseStats: !hasCustomStats,
        importedSet,
        promptStatPoints: effectivePromptStatPoints,
        effectiveStatPoints: effectiveSet.statPoints,
        megaTarget,
        stageBoosts: {
          hp: 0,
          atk: atkStage,
          def: 0,
          spa: spaStage,
          spd: 0,
          spe: attackerSpeedStage,
        },
        itemBoosts: attackerChoiceBoosts,
      };
    }

    const defender = defenderPromptSpecies;
    if (!defender) {
      return null;
    }

    const importedSet = defenderImportedSet;
    const effectiveSet = buildEffectiveSetPreview(
      importedSet,
      effectivePromptStatPoints,
      parsedCommand?.defenderNature,
    );
    const hasCustomStats = Boolean(importedSet || effectivePromptStatPoints);
    const stats = hasCustomStats
      ? computeStats(
          defender.baseStats,
          effectiveSet.evs,
          effectiveSet.ivs,
          effectiveSet.nature,
          importedSet?.level ?? 50,
        )
      : defender.baseStats;

    const defStage = moveCategory === "Special" ? 0 : defenderStatStage;
    const spdStage = moveCategory === "Physical" ? 0 : defenderStatStage;
    const defenderChoiceBoosts = getItemStatBoosts(defenderItemName);
    const megaTarget = defender.isMega
      ? defender.baseSpeciesId
        ? (pokemonById.get(defender.baseSpeciesId) ?? null)
        : null
      : resolveMegaEvolution(defender.id, defenderItemName ?? undefined);

    return {
      title: "Defender",
      name: defender.name,
      pokemonId: defender.id,
      promptPokemonId: defenderPromptSpecies?.id ?? defender.id,
      spriteSources: getPokemonSpriteSources(defender),
      ability: resolveAbilityDisplay(
        defender,
        parsedCommand?.defenderAbility ??
          structure.defender.abilityToken?.value,
      ),
      move: null,
      activeMoveEntry: null,
      item: defenderItemName,
      nature: effectiveSet.nature,
      stats,
      isBaseStats: !hasCustomStats,
      importedSet,
      promptStatPoints: effectivePromptStatPoints,
      effectiveStatPoints: effectiveSet.statPoints,
      megaTarget,
      stageBoosts: {
        hp: 0,
        atk: 0,
        def: defStage,
        spa: 0,
        spd: spdStage,
        spe: defenderSpeedStage,
      },
      itemBoosts: defenderChoiceBoosts,
    };
  }, [commandStructure, importedSets, parsedCommand, pendingStatPoints, side]);
}
