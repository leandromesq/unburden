import { useMemo } from "react";

import { useI18n } from "@/i18n/I18nProvider";
import { itemDisplayById } from "@/lib/data/items";
import { moveById } from "@/lib/data/moves";
import { normalizeAlias, normalizeId } from "@/lib/data/normalization";
import { pokemonById, resolveMegaEvolution } from "@/lib/data/pokemon";
import { getPokemonSpriteSources } from "@/lib/pokemon-sprites";
import {
  DEFAULT_IV_SPREAD,
  EMPTY_STAT_SPREAD,
  computeStats,
  sumStatPoints,
  statPointsToCalcEvs,
} from "@/lib/calc/stat-calc";
import {
  resolveAttackerRepresentativeNature,
  resolveAttackingStatKey,
} from "@/lib/calc/move-stat-context";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import {
  ATTACKER_NEGATIVE_NATURE,
  ATTACKER_MODIFIER_MAP,
  ATTACKER_POSITIVE_NATURE,
  DEFENDER_NEGATIVE_NATURE,
  DEFENDER_MODIFIER_MAP,
  DEFENDER_POSITIVE_NATURE,
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
  PokemonStatus,
  StatSpread,
} from "@/lib/types";

type SummarySide = "attacker" | "defender";
type StatKey = keyof StatSpread;
type SummaryInvestment =
  | ParsedCommand["attackerInvestment"]
  | ParsedCommand["defenderInvestment"];

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
  contextKey: string;
  title: string;
  name: string;
  pokemonId: string;
  isMega: boolean;
  promptPokemonId: string;
  spriteSources: string[];
  primaryType: string | null;
  types: string[];
  ability: string | null;
  move: string | null;
  moveId: string | null;
  moveCategory: string | null;
  activeMoveEntry:
    | (typeof moveById extends Map<string, infer T> ? T : never)
    | null;
  item: string | null;
  status: PokemonStatus | null;
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
  currentHpPercent: number;
  stageBoosts: StatSpread;
  itemBoosts: ItemStatBoosts;
}

interface UsePokemonSummaryOptions {
  side: SummarySide;
  commandStructure: ReturnType<typeof analyzeCommandStructure>;
  parsedCommand: ParsedCommand | null;
  importedSets: Record<string, ImportedSet>;
  pendingStatPoints: StatSpread | null;
  pendingContextKey: string;
  pendingNature: string | null;
}

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
  importedSets: Record<string, ImportedSet>,
): PokemonEntry | null {
  const referenceSet = resolveSetReferenceToken(
    segment.leadingFreeTokens[0]?.raw,
    importedSets,
  );

  if (referenceSet && segment.leadingRemainderTokens.length === 0) {
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
  importedSetAbility?: string | undefined,
): string | null {
  if (!pokemon) {
    return null;
  }

  const resolvedAbility = explicitAbility ?? importedSetAbility;

  if (resolvedAbility) {
    const knownAbilities = buildCommonAbilities(undefined, pokemon.abilities);
    const normalized = normalizeAlias(resolvedAbility);

    return (
      knownAbilities.find(
        (ability) => normalizeAlias(ability) === normalized,
      ) ?? resolvedAbility
    );
  }

  return inferDefaultAbility(pokemon.id);
}

function buildEmptyStageSpread(): StatSpread {
  return {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  };
}

function clampStage(value: number) {
  return Math.max(-6, Math.min(6, value));
}

function buildStageBoosts(
  tokens: ReturnType<
    typeof analyzeCommandStructure
  >["attacker"]["modifierTokens"],
  map: typeof ATTACKER_MODIFIER_MAP,
  side: SummarySide,
  moveId: string | null,
  moveCategory: string | null,
): StatSpread {
  const stageBoosts = buildEmptyStageSpread();
  let genericStage = 0;

  for (const token of tokens) {
    const definition = map.get(token.value);
    if (!definition) {
      continue;
    }

    if (definition.kind === "stat_mod") {
      genericStage += definition.statMod ?? 0;
      continue;
    }

    if (
      (definition.kind === "stat_stage" || definition.kind === "speed_mod") &&
      definition.statKey
    ) {
      stageBoosts[definition.statKey] += definition.statMod ?? 0;
    }
  }

  const clampedGenericStage = clampStage(genericStage);

  if (side === "attacker") {
    const attackingStatKey = resolveAttackingStatKey(moveId, moveCategory);
    stageBoosts[attackingStatKey] += clampedGenericStage;
  } else if (moveCategory) {
    stageBoosts[moveCategory === "Special" ? "spd" : "def"] +=
      clampedGenericStage;
  }

  return {
    hp: 0,
    atk: clampStage(stageBoosts.atk),
    def: clampStage(stageBoosts.def),
    spa: clampStage(stageBoosts.spa),
    spd: clampStage(stageBoosts.spd),
    spe: clampStage(stageBoosts.spe),
  };
}

function resolveCurrentHpPercent(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
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
  investment: SummaryInvestment,
) {
  const baseStatPoints =
    statPoints ?? importedSet?.statPoints ?? EMPTY_STAT_SPREAD;
  const effectiveStatPoints = applyInvestmentPreview(
    baseStatPoints,
    investment,
  );
  const effectiveNature = nature ?? importedSet?.nature ?? "Hardy";

  return {
    statPoints: effectiveStatPoints,
    evs: statPointsToCalcEvs(effectiveStatPoints),
    ivs: { ...DEFAULT_IV_SPREAD },
    nature: effectiveNature,
  };
}

function applyInvestmentPreview(
  statPoints: StatSpread,
  investment: SummaryInvestment,
) {
  const investmentStat =
    investment === "max_atk"
      ? "atk"
      : investment === "max_spa"
        ? "spa"
        : investment === "max_def"
          ? "def"
          : investment === "max_spd"
            ? "spd"
            : null;

  if (!investmentStat) {
    return statPoints;
  }

  const nextStatPoints = { ...statPoints };
  const nextTotal =
    sumStatPoints(nextStatPoints) - nextStatPoints[investmentStat] + 32;

  if (nextTotal > 66) {
    return {
      ...EMPTY_STAT_SPREAD,
      [investmentStat]: 32,
    };
  }

  nextStatPoints[investmentStat] = 32;
  return nextStatPoints;
}

function resolveSummaryInvestment(
  scope: SummarySide,
  modifierValues: string[],
): SummaryInvestment {
  const modifierMap =
    scope === "attacker" ? ATTACKER_MODIFIER_MAP : DEFENDER_MODIFIER_MAP;
  let resolvedInvestment: SummaryInvestment = "auto";

  for (const value of modifierValues) {
    const definition = modifierMap.get(value);
    if (definition?.kind === "investment") {
      resolvedInvestment = definition.investment as SummaryInvestment;
    }
  }

  return resolvedInvestment;
}

function resolveSummaryNature(
  scope: SummarySide,
  modifierValues: string[],
  moveId: string | null,
  moveCategory: string | null,
) {
  const modifierMap =
    scope === "attacker" ? ATTACKER_MODIFIER_MAP : DEFENDER_MODIFIER_MAP;
  let representativeNature: string | undefined;
  let explicitNature: string | undefined;

  for (const value of modifierValues) {
    const definition = modifierMap.get(value);
    if (definition?.kind !== "nature") {
      continue;
    }

    const resolvedNature = definition.nature;
    if (!resolvedNature) {
      continue;
    }

    if (scope === "attacker") {
      if (resolvedNature === ATTACKER_POSITIVE_NATURE) {
        representativeNature = resolveAttackerRepresentativeNature(
          moveId,
          moveCategory,
          "boost",
        );
      } else if (resolvedNature === ATTACKER_NEGATIVE_NATURE) {
        representativeNature = resolveAttackerRepresentativeNature(
          moveId,
          moveCategory,
          "nerf",
        );
      } else {
        explicitNature = resolvedNature;
      }
      continue;
    }

    if (resolvedNature === DEFENDER_POSITIVE_NATURE) {
      representativeNature =
        moveCategory === "Physical"
          ? "Bold"
          : moveCategory === "Special"
            ? "Calm"
            : undefined;
    } else if (resolvedNature === DEFENDER_NEGATIVE_NATURE) {
      representativeNature =
        moveCategory === "Physical"
          ? "Mild"
          : moveCategory === "Special"
            ? "Rash"
            : undefined;
    } else {
      explicitNature = resolvedNature;
    }
  }

  return explicitNature ?? representativeNature;
}

function resolveSummaryStatus(
  scope: SummarySide,
  modifierValues: string[],
): PokemonStatus | undefined {
  const modifierMap =
    scope === "attacker" ? ATTACKER_MODIFIER_MAP : DEFENDER_MODIFIER_MAP;

  for (let index = modifierValues.length - 1; index >= 0; index -= 1) {
    const definition = modifierMap.get(modifierValues[index]);
    if (definition?.kind === "status") {
      return definition.status;
    }
  }

  return undefined;
}

export function usePokemonSummary({
  side,
  commandStructure,
  parsedCommand,
  importedSets,
  pendingStatPoints,
  pendingContextKey,
  pendingNature,
}: UsePokemonSummaryOptions): PokemonSummaryData | null {
  const { dictionary } = useI18n();

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
      ) ?? attackerReferenceSet;

    const defenderImportedSet =
      resolveReferencedImportedSet(
        parsedCommand?.defenderSetReferenceId,
        importedSets,
      ) ?? defenderReferenceSet;

    const promptStatPoints =
      side === "attacker"
        ? parsedCommand?.attackerStatPoints
        : parsedCommand?.defenderStatPoints;

    const moveSlug = structure.attacker.moveToken?.value;
    const moveName = resolveMoveName(moveSlug);
    const moveEntry = moveSlug
      ? (moveById.get(normalizeId(moveSlug)) ??
        resolveMoveEntity(moveSlug.replace(/-/g, " "))?.entry ??
        null)
      : null;
    const moveId = moveEntry?.id ?? null;
    const moveCategory = moveEntry?.category ?? null;
    const attackerModifierValues = structure.attacker.modifierTokens.map(
      (token) => token.value,
    );
    const defenderModifierValues = structure.defender.modifierTokens.map(
      (token) => token.value,
    );
    const attackerStageBoosts = buildStageBoosts(
      structure.attacker.modifierTokens,
      ATTACKER_MODIFIER_MAP,
      "attacker",
      moveId,
      moveCategory,
    );
    const defenderStageBoosts = buildStageBoosts(
      structure.defender.modifierTokens,
      DEFENDER_MODIFIER_MAP,
      "defender",
      moveId,
      moveCategory,
    );
    const attackerCurrentHpPercent = resolveCurrentHpPercent(
      parsedCommand?.attackerCurrentHpPercent ??
        (structure.attacker.hpToken
          ? Number(structure.attacker.hpToken.value)
          : undefined),
    );
    const defenderCurrentHpPercent = resolveCurrentHpPercent(
      parsedCommand?.defenderCurrentHpPercent ??
        (structure.defender.hpToken
          ? Number(structure.defender.hpToken.value)
          : undefined),
    );

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
    const fallbackAttackerNature = resolveSummaryNature(
      "attacker",
      attackerModifierValues,
      moveId,
      moveCategory,
    );
    const fallbackDefenderNature = resolveSummaryNature(
      "defender",
      defenderModifierValues,
      moveId,
      moveCategory,
    );
    const fallbackAttackerInvestment = resolveSummaryInvestment(
      "attacker",
      attackerModifierValues,
    );
    const fallbackDefenderInvestment = resolveSummaryInvestment(
      "defender",
      defenderModifierValues,
    );
    const fallbackAttackerStatus = resolveSummaryStatus(
      "attacker",
      attackerModifierValues,
    );
    const fallbackDefenderStatus = resolveSummaryStatus(
      "defender",
      defenderModifierValues,
    );

    if (side === "attacker") {
      const attacker = attackerPromptSpecies;
      if (!attacker) {
        return null;
      }

      const importedSet = attackerImportedSet;
      const contextKey = [
        attackerPromptSpecies?.id ?? attacker.id,
        attacker.id,
        importedSet?.speciesId ?? "",
      ].join("::");
      const activePendingStatPoints =
        pendingContextKey === contextKey ? pendingStatPoints : null;
      const activePendingNature =
        pendingContextKey === contextKey ? pendingNature : null;
      const effectivePromptStatPoints =
        promptStatPoints &&
        activePendingStatPoints &&
        STAT_LABELS.every(
          ([key]) => promptStatPoints[key] === activePendingStatPoints[key],
        )
          ? promptStatPoints
          : (activePendingStatPoints ?? promptStatPoints);
      const effectiveSet = buildEffectiveSetPreview(
        importedSet,
        effectivePromptStatPoints,
        activePendingNature ??
          parsedCommand?.attackerNature ??
          fallbackAttackerNature,
        parsedCommand?.attackerInvestment ?? fallbackAttackerInvestment,
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

      const attackerChoiceBoosts = getItemStatBoosts(attackerItemName);
      const megaTarget = attacker.isMega
        ? attacker.baseSpeciesId
          ? (pokemonById.get(attacker.baseSpeciesId) ?? null)
          : null
        : resolveMegaEvolution(attacker.id, attackerItemName ?? undefined);

      return {
        contextKey,
        title: dictionary.modifierSwitches.attacker,
        name: attacker.name,
        pokemonId: attacker.id,
        isMega: Boolean(attacker.isMega),
        promptPokemonId: attackerPromptSpecies?.id ?? attacker.id,
        spriteSources: getPokemonSpriteSources(attacker),
        primaryType: attacker.types[0] ?? null,
        types: attacker.types,
        ability: resolveAbilityDisplay(
          attacker,
          parsedCommand?.attackerAbility ??
            structure.attacker.abilityToken?.value,
          importedSet?.ability,
        ),
        move: parsedCommand?.move ?? moveName,
        moveId,
        moveCategory,
        activeMoveEntry: moveEntry,
        item: attackerItemName,
        status: parsedCommand?.attackerStatus ?? fallbackAttackerStatus ?? null,
        nature: effectiveSet.nature,
        stats,
        isBaseStats: !hasCustomStats,
        importedSet,
        promptStatPoints,
        effectiveStatPoints: effectiveSet.statPoints,
        megaTarget,
        currentHpPercent: attackerCurrentHpPercent,
        stageBoosts: attackerStageBoosts,
        itemBoosts: attackerChoiceBoosts,
      };
    }

    const defender = defenderPromptSpecies;
    if (!defender) {
      return null;
    }

    const importedSet = defenderImportedSet;
    const contextKey = [
      defenderPromptSpecies?.id ?? defender.id,
      defender.id,
      importedSet?.speciesId ?? "",
    ].join("::");
    const activePendingStatPoints =
      pendingContextKey === contextKey ? pendingStatPoints : null;
    const activePendingNature =
      pendingContextKey === contextKey ? pendingNature : null;
    const effectivePromptStatPoints =
      promptStatPoints &&
      activePendingStatPoints &&
      STAT_LABELS.every(
        ([key]) => promptStatPoints[key] === activePendingStatPoints[key],
      )
        ? promptStatPoints
        : (activePendingStatPoints ?? promptStatPoints);
    const effectiveSet = buildEffectiveSetPreview(
      importedSet,
      effectivePromptStatPoints,
      activePendingNature ??
        parsedCommand?.defenderNature ??
        fallbackDefenderNature,
      parsedCommand?.defenderInvestment ?? fallbackDefenderInvestment,
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

    const defenderChoiceBoosts = getItemStatBoosts(defenderItemName);
    const megaTarget = defender.isMega
      ? defender.baseSpeciesId
        ? (pokemonById.get(defender.baseSpeciesId) ?? null)
        : null
      : resolveMegaEvolution(defender.id, defenderItemName ?? undefined);

    return {
      contextKey,
      title: dictionary.modifierSwitches.defender,
      name: defender.name,
      pokemonId: defender.id,
      isMega: Boolean(defender.isMega),
      promptPokemonId: defenderPromptSpecies?.id ?? defender.id,
      spriteSources: getPokemonSpriteSources(defender),
      primaryType: defender.types[0] ?? null,
      types: defender.types,
      ability: resolveAbilityDisplay(
        defender,
        parsedCommand?.defenderAbility ??
          structure.defender.abilityToken?.value,
        importedSet?.ability,
      ),
      move: null,
      moveId,
      moveCategory,
      activeMoveEntry: null,
      item: defenderItemName,
      status: parsedCommand?.defenderStatus ?? fallbackDefenderStatus ?? null,
      nature: effectiveSet.nature,
      stats,
      isBaseStats: !hasCustomStats,
      importedSet,
      promptStatPoints,
      effectiveStatPoints: effectiveSet.statPoints,
      megaTarget,
      currentHpPercent: defenderCurrentHpPercent,
      stageBoosts: defenderStageBoosts,
      itemBoosts: defenderChoiceBoosts,
    };
  }, [
    commandStructure,
    dictionary.modifierSwitches.attacker,
    dictionary.modifierSwitches.defender,
    importedSets,
    parsedCommand,
    pendingContextKey,
    pendingNature,
    pendingStatPoints,
    side,
  ]);
}
