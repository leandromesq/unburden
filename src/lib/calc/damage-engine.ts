import { Field, Generations, Move, Pokemon, calculate } from "@smogon/calc";

import { buildCustomSetArchetypeConfig, getArchetypeConfigs } from "@/lib/calc/archetypes";
import { resolveAttackingStatKey } from "@/lib/calc/move-stat-context";
import {
  DEFAULT_IV_SPREAD,
  EMPTY_STAT_SPREAD,
  applyStage,
  cloneStatSpread,
  computeStats,
  evToStatPointsValue,
  statPointsToCalcEvs,
} from "@/lib/calc/stat-calc";
import { normalizeKoText } from "@/lib/calc/ko-text";
import { moveById } from "@/lib/data/moves";
import { normalizeId } from "@/lib/data/normalization";
import { pokemonById } from "@/lib/data/pokemon";
import { inferDefaultAbility, inferDefaultItem } from "@/lib/parser/inference";
import { resolveReferencedImportedSet } from "@/lib/team/set-references";
import type {
  DamageResult,
  ImportedSet,
  ParsedCommand,
  PokemonStatus,
  StatSpread,
} from "@/lib/types";

const GEN_9 = Generations.get(9);

function roundPercent(value: number) {
  return Number(value.toFixed(1));
}

function extractRollDamages(damage: ReturnType<typeof calculate>["damage"]) {
  if (typeof damage === "number") {
    return [damage];
  }

  if (!Array.isArray(damage)) {
    return [];
  }

  if (damage.every((roll): roll is number => typeof roll === "number")) {
    return damage;
  }

  const damageByHit = damage.filter((roll): roll is number[] =>
    Array.isArray(roll),
  );
  const rollCount = Math.max(0, ...damageByHit.map((rolls) => rolls.length));

  return Array.from({ length: rollCount }, (_entry, index) =>
    damageByHit.reduce((sum, rolls) => sum + (rolls[index] ?? 0), 0),
  );
}

function buildDamageRolls(
  damage: ReturnType<typeof calculate>["damage"],
  maxHP: number,
) {
  return extractRollDamages(damage).map((roll) => ({
    damage: roll,
    percentage: roundPercent((roll / maxHP) * 100),
  }));
}

function toCurrentHp(maxHP: number, percent: number | undefined) {
  if (percent === undefined || percent >= 100) {
    return maxHP;
  }

  return Math.max(0, Math.round((maxHP * percent) / 100));
}

function getWeather(parsed: ParsedCommand) {
  if (parsed.globalEffects.includes("rain")) {
    return "Rain";
  }

  if (parsed.globalEffects.includes("sun")) {
    return "Sun";
  }

  if (parsed.globalEffects.includes("sand")) {
    return "Sand";
  }

  if (parsed.globalEffects.includes("snow")) {
    return "Snow";
  }

  return undefined;
}

function hasMegaSolWeatherOverride(ability: string | undefined) {
  const normalizedAbility = normalizeId(ability ?? "");
  return normalizedAbility === "megasol";
}

function getEffectiveWeather(
  parsed: ParsedCommand,
  attackerAbility: string | undefined,
) {
  if (hasMegaSolWeatherOverride(attackerAbility)) {
    return "Sun" as const;
  }

  return getWeather(parsed);
}

function getTerrain(parsed: ParsedCommand) {
  if (parsed.globalEffects.includes("electric_terrain")) {
    return "Electric";
  }

  if (parsed.globalEffects.includes("grassy_terrain")) {
    return "Grassy";
  }

  if (parsed.globalEffects.includes("psychic_terrain")) {
    return "Psychic";
  }

  if (parsed.globalEffects.includes("misty_terrain")) {
    return "Misty";
  }

  return undefined;
}

function formatStatusLabel(status: PokemonStatus) {
  switch (status) {
    case "brn":
      return "Burn";
    case "par":
      return "Paralysis";
    case "psn":
      return "Poison";
    case "slp":
      return "Sleep";
    case "frz":
      return "Freeze";
  }
}

function getMoveHitMetadata(moveName: string) {
  const moveId = normalizeId(moveName) as Parameters<typeof GEN_9.moves.get>[0];
  const moveData = GEN_9.moves.get(moveId);

  if (!moveData?.multihit) {
    return {
      hitCount: undefined,
      isVariable: false,
    };
  }

  if (Array.isArray(moveData.multihit)) {
    return {
      hitCount: Math.round((moveData.multihit[0] + moveData.multihit[1]) / 2),
      isVariable: true,
    };
  }

  if (moveData.id === "populationbomb") {
    return {
      hitCount: 10,
      isVariable: true,
    };
  }

  return {
    hitCount: moveData.multihit,
    isVariable: false,
  };
}

function resolveCalcSpeciesName(pokemon: {
  id: string;
  name: string;
  baseSpeciesId?: string;
}, side: "attacker" | "defender", explicitFormId?: string) {
  const defaultAegislashFormId =
    pokemon.id === "aegislash"
      ? side === "attacker"
        ? "aegislashblade"
        : "aegislashshield"
      : undefined;
  const candidateIds = [
    explicitFormId,
    defaultAegislashFormId,
    normalizeId(pokemon.name),
    pokemon.id,
    pokemon.baseSpeciesId,
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidateId of candidateIds) {
    const species = GEN_9.species.get(candidateId as Parameters<typeof GEN_9.species.get>[0]);

    if (species) {
      return species.name;
    }
  }

  return null;
}

function createCalcPokemon(
  pokemon: {
    id: string;
    name: string;
    baseSpeciesId?: string;
  },
  side: "attacker" | "defender",
  options: ConstructorParameters<typeof Pokemon>[2],
  explicitFormId?: string,
) {
  const calcSpeciesName = resolveCalcSpeciesName(pokemon, side, explicitFormId);

  if (!calcSpeciesName) {
    return null;
  }

  try {
    return {
      calcSpeciesName,
      pokemon: new Pokemon(9, calcSpeciesName, options),
    };
  } catch {
    return null;
  }
}

type ValueSource = "prompt" | "set" | "default" | "archetype";

function buildBaseIvs() {
  return { ...DEFAULT_IV_SPREAD };
}

function buildBaseEvs(importedSet: ImportedSet | null, fallback: StatSpread) {
  return cloneStatSpread(importedSet?.evs, fallback);
}

function buildPromptStatPointSet(
  speciesId: string,
  speciesName: string,
  baseSet: ImportedSet | null,
  statPoints: StatSpread | undefined,
  item: string | undefined,
  ability: string | undefined,
  nature: string | undefined,
): ImportedSet | null {
  if (!statPoints && !baseSet) {
    return null;
  }

  const resolvedStatPoints = cloneStatSpread(
    statPoints,
    baseSet?.statPoints ?? EMPTY_STAT_SPREAD,
  );

  return {
    speciesId,
    speciesName,
    nickname: baseSet?.nickname,
    item,
    ability,
    level: baseSet?.level ?? 50,
    nature: nature ?? baseSet?.nature ?? "Hardy",
    statPoints: resolvedStatPoints,
    evs: statPointsToCalcEvs(resolvedStatPoints),
    ivs: { ...DEFAULT_IV_SPREAD },
    moves: baseSet?.moves ?? [],
    teraType: baseSet?.teraType,
  };
}

function getResolvedAttackerAbility(
  parsed: ParsedCommand,
  attackerSet: ImportedSet | null,
  attackerId: string,
) {
  return (
    parsed.attackerAbility ??
    attackerSet?.ability ??
    inferDefaultAbility(attackerId) ??
    undefined
  );
}

function getResolvedDefenderAbility(
  parsed: ParsedCommand,
  defenderSet: ImportedSet | null,
  defenderId: string,
) {
  return (
    parsed.defenderAbility ??
    defenderSet?.ability ??
    inferDefaultAbility(defenderId) ??
    undefined
  );
}

function getResolvedDefenderItem(
  parsed: ParsedCommand,
  defenderSet: ImportedSet | null,
  defenderId: string,
  requiresTargetItem: boolean,
) {
  return (
    parsed.defenderItem ??
    defenderSet?.item ??
    (requiresTargetItem
      ? inferDefaultItem(defenderId) ?? "Leftovers"
      : undefined)
  );
}

function getResolvedMoveHitCount(parsed: ParsedCommand) {
  const moveHitMetadata = getMoveHitMetadata(parsed.move);

  return {
    moveHitMetadata,
    moveHitCount: parsed.moveHitCount ?? moveHitMetadata.hitCount,
  };
}

function getSpeedRelevantAbilityMultiplier(
  ability: string | undefined,
  weather: ReturnType<typeof getWeather>,
  terrain: ReturnType<typeof getTerrain>,
  status: PokemonStatus | undefined,
) {
  const normalizedAbility = normalizeId(ability ?? "");
  const hasStatus = Boolean(status);

  if (normalizedAbility === "quickfeet" && hasStatus) {
    return 1.5;
  }

  if (normalizedAbility === "swiftswim" && weather === "Rain") {
    return 2;
  }

  if (normalizedAbility === "chlorophyll" && weather === "Sun") {
    return 2;
  }

  if (normalizedAbility === "sandrush" && weather === "Sand") {
    return 2;
  }

  if (normalizedAbility === "slushrush" && weather === "Snow") {
    return 2;
  }

  if (normalizedAbility === "surgesurfer" && terrain === "Electric") {
    return 2;
  }

  return 1;
}

function getSpeedRelevantItemMultiplier(item: string | undefined) {
  const normalizedItem = normalizeId(item ?? "");

  if (normalizedItem === "choicescarf") {
    return 1.5;
  }

  if (
    new Set([
      "ironball",
      "machobrace",
      "poweranklet",
      "powerband",
      "powerbelt",
      "powerbracer",
      "powerlens",
      "powerweight",
    ]).has(normalizedItem)
  ) {
    return 0.5;
  }

  return 1;
}

function buildEffectiveSpeed(
  pokemon: { baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } },
  options: {
    evs: StatSpread;
    ivs: StatSpread;
    nature: string;
    level: number;
    speedStage: number;
    status: PokemonStatus | undefined;
    hasTailwind: boolean;
    ability: string | undefined;
    item: string | undefined;
    weather: ReturnType<typeof getWeather>;
    terrain: ReturnType<typeof getTerrain>;
  },
) {
  const stats = computeStats(pokemon.baseStats, options.evs, options.ivs, options.nature, options.level);
  let effectiveSpeed = applyStage(stats.spe, options.speedStage);
  const quickFeetActive =
    normalizeId(options.ability ?? "") === "quickfeet" && Boolean(options.status);

  if (options.status === "par" && !quickFeetActive) {
    effectiveSpeed = Math.floor(effectiveSpeed * 0.5);
  }

  effectiveSpeed = Math.floor(
    effectiveSpeed *
    getSpeedRelevantAbilityMultiplier(
      options.ability,
      options.weather,
      options.terrain,
      options.status,
    ),
  );
  effectiveSpeed = Math.floor(
    effectiveSpeed * getSpeedRelevantItemMultiplier(options.item),
  );

  if (options.hasTailwind) {
    effectiveSpeed *= 2;
  }

  return {
    rawSpeed: stats.spe,
    effectiveSpeed,
  };
}

function shouldDescribeSpeedContext(
  parsed: ParsedCommand,
  moveName: string,
  attackerAbility: string | undefined,
  defenderAbility: string | undefined,
  attackerItem: string | undefined,
  defenderItem: string | undefined,
) {
  const moveId = normalizeId(moveName);

  if (moveId === "electroball" || moveId === "gyroball") {
    return true;
  }

  if (
    parsed.attackerSpeedMod !== 0 ||
    parsed.defenderSpeedMod !== 0 ||
    parsed.attackerStatus === "par" ||
    parsed.defenderStatus === "par" ||
    parsed.attackerSideEffects.includes("tailwind") ||
    parsed.defenderSideEffects.includes("tailwind")
  ) {
    return true;
  }

  const relevantAbilities = new Set([
    "chlorophyll",
    "quickfeet",
    "sandrush",
    "slushrush",
    "surgesurfer",
    "swiftswim",
  ]);
  const relevantItems = new Set([
    "choicescarf",
    "ironball",
    "machobrace",
    "poweranklet",
    "powerband",
    "powerbelt",
    "powerbracer",
    "powerlens",
    "powerweight",
  ]);

  return (
    relevantAbilities.has(normalizeId(attackerAbility ?? "")) ||
    relevantAbilities.has(normalizeId(defenderAbility ?? "")) ||
    relevantItems.has(normalizeId(attackerItem ?? "")) ||
    relevantItems.has(normalizeId(defenderItem ?? ""))
  );
}

function buildAbilityFlags(attackerAbility: string | undefined, defenderAbility: string | undefined) {
  const abilities = [attackerAbility, defenderAbility].filter(Boolean);
  const normalized = new Set(abilities.map((ability) => normalizeId(ability!)));

  return {
    isBeadsOfRuin: normalized.has("beadsofruin"),
    isSwordOfRuin: normalized.has("swordofruin"),
    isTabletsOfRuin: normalized.has("tabletsofruin"),
    isVesselOfRuin: normalized.has("vesselofruin"),
  };
}

function clampStage(value: number) {
  return Math.max(-6, Math.min(6, value));
}

function buildAppliedStageBoosts(
  parsed: ParsedCommand,
  moveCategory: string,
) {
  const attackerBoosts: StatSpread = {
    ...parsed.attackerStageMods,
    hp: 0,
  };
  const defenderBoosts: StatSpread = {
    ...parsed.defenderStageMods,
    hp: 0,
  };
  const attackerStageStatKey = resolveAttackingStatKey(parsed.move, moveCategory);
  const defenderStageStatKey = moveCategory === "Physical" ? "def" : "spd";

  attackerBoosts[attackerStageStatKey] = clampStage(
    attackerBoosts[attackerStageStatKey] + parsed.attackerStatMod,
  );
  defenderBoosts[defenderStageStatKey] = clampStage(
    defenderBoosts[defenderStageStatKey] + parsed.defenderStatMod,
  );
  attackerBoosts.spe = clampStage(attackerBoosts.spe);
  defenderBoosts.spe = clampStage(defenderBoosts.spe);

  return {
    attackerBoosts,
    defenderBoosts,
  };
}

function splitShowdownText(text: string) {
  const separatorIndex = text.indexOf(":");
  if (separatorIndex === -1) {
    return {
      contextText: text,
      damageText: "",
    };
  }

  return {
    contextText: text.slice(0, separatorIndex),
    damageText: text.slice(separatorIndex + 1).trim(),
  };
}

function convertShowdownContextToStatPoints(contextText: string) {
  return contextText.replace(
    /(\d+)([+-]?)\s+(HP|Atk|Def|SpA|SpD|Spe)\b/g,
    (_match, evValue, natureModifier, statLabel) => {
      const statPoints = evToStatPointsValue(Number(evValue));
      return `${statPoints}${natureModifier} ${statLabel}`;
    },
  );
}

function deriveKoText(damageText: string) {
  const separatorIndex = damageText.indexOf("--");
  if (separatorIndex === -1) {
    return "Damage range";
  }

  return normalizeKoText(damageText.slice(separatorIndex + 2).trim());
}

function formatDamagePercent(damage: number, maxHP: number) {
  return `${roundPercent((damage / maxHP) * 100)}`;
}

function buildFallbackContextText(
  attackerSpeciesName: string,
  moveName: string,
  defenderSpeciesName: string,
) {
  return `${attackerSpeciesName} ${moveName} vs. ${defenderSpeciesName}`;
}

function deriveFallbackKoText(
  result: ReturnType<typeof calculate>,
  maxDamage: number,
) {
  if (maxDamage === 0) {
    return "No damage";
  }

  try {
    return normalizeKoText(result.kochance().text);
  } catch {
    return "KO chance unavailable";
  }
}

function describeResultSafely(
  result: ReturnType<typeof calculate>,
  attackerSpeciesName: string,
  defenderSpeciesName: string,
  moveName: string,
  minDamage: number,
  maxDamage: number,
  maxHP: number,
) {
  try {
    const showdownText = result.desc();
    const { contextText, damageText } = splitShowdownText(showdownText);
    const spContextText = convertShowdownContextToStatPoints(contextText);

    return {
      showdownText: `${spContextText}: ${damageText}`,
      contextText: spContextText,
      damageText,
      koChanceText: deriveKoText(damageText),
    };
  } catch {
    const koChanceText = deriveFallbackKoText(result, maxDamage);
    const contextText = buildFallbackContextText(
      attackerSpeciesName,
      moveName,
      defenderSpeciesName,
    );
    const spContextText = convertShowdownContextToStatPoints(contextText);
    const damageText = `${minDamage}-${maxDamage} (${formatDamagePercent(minDamage, maxHP)} - ${formatDamagePercent(maxDamage, maxHP)}%) -- ${koChanceText}`;

    return {
      showdownText: `${spContextText}: ${damageText}`,
      contextText: spContextText,
      damageText,
      koChanceText,
    };
  }
}

function isRelevantAbility(
  ability: string | undefined,
  side: "attacker" | "defender",
  moveType: string,
  moveCategory: string,
  hasWeatherBoost: boolean,
  hasTerrainBoost: boolean,
) {
  if (!ability) {
    return false;
  }

  const normalized = normalizeId(ability);

  const attackerRelevant = new Set([
    "adaptability",
    "batterypack",
    "dragonsmaw",
    "galvanize",
    "guts",
    "hugepower",
    "ironfist",
    "megalauncher",
    "normalize",
    "pixilate",
    "purepower",
    "punkrock",
    "refrigerate",
    "reckless",
    "rockypayload",
    "sharpness",
    "sheerforce",
    "solarpower",
    "steelworker",
    "strongjaw",
    "supremeoverlord",
    "swordofruin",
    "beadsofruin",
    "technician",
    "transistor",
    "waterbubble",
  ]);
  const defenderRelevant = new Set([
    "dryskin",
    "eartheater",
    "filter",
    "flashfire",
    "fluffy",
    "furcoat",
    "heatproof",
    "icescales",
    "levitate",
    "lightningrod",
    "motordrive",
    "multiscale",
    "prismarmor",
    "sapsipper",
    "solidrock",
    "stormdrain",
    "thickfat",
    "voltabsorb",
    "waterabsorb",
    "wellbakedbody",
    "windrider",
  ]);

  if (side === "attacker") {
    if (normalized === "protosynthesis") {
      return hasWeatherBoost;
    }

    if (normalized === "quarkdrive") {
      return hasTerrainBoost;
    }

    return attackerRelevant.has(normalized);
  }

  if (moveType === "Ground" && normalized === "levitate") {
    return true;
  }

  if (moveType === "Fire" && new Set(["flashfire", "wellbakedbody", "heatproof", "thickfat"]).has(normalized)) {
    return true;
  }

  if (moveType === "Water" && new Set(["dryskin", "stormdrain", "waterabsorb"]).has(normalized)) {
    return true;
  }

  if (moveType === "Electric" && new Set(["lightningrod", "motordrive", "voltabsorb"]).has(normalized)) {
    return true;
  }

  if (moveType === "Grass" && normalized === "sapsipper") {
    return true;
  }

  if (moveType === "Flying" && normalized === "windrider") {
    return true;
  }

  if (normalized === "furcoat" && moveCategory === "Physical") {
    return true;
  }

  if (normalized === "icescales" && moveCategory === "Special") {
    return true;
  }

  return defenderRelevant.has(normalized);
}

function describeAssumptions(
  parsed: ParsedCommand,
  attackerSpeciesName: string,
  defenderSpeciesName: string,
  attackerItem: string | undefined,
  defenderItem: string | undefined,
  attackerItemSource: ValueSource,
  defenderItemSource: ValueSource,
  attackerAbility: string | undefined,
  defenderAbility: string | undefined,
  attackerAbilitySource: ValueSource,
  defenderAbilitySource: ValueSource,
  moveType: string,
  moveCategory: string,
  attackerSet: ImportedSet | null,
  defenderSet: ImportedSet | null,
  resolvedMoveHitCount: number | undefined,
  isVariableHitMove: boolean,
  speedContext?: {
    attackerSpeed: number;
    defenderSpeed: number;
    ratio?: number;
  },
  hasMegaSolOverride?: boolean,
  lastRespectsStacks?: number,
  isSpreadMoveSingleTarget?: boolean,
) {
  const assumptions: string[] = [];
  const hasWeatherBoost = parsed.globalEffects.includes("sun");
  const hasTerrainBoost = parsed.globalEffects.includes("electric_terrain");
  const { attackerBoosts, defenderBoosts } = buildAppliedStageBoosts(
    parsed,
    moveCategory,
  );
  const statLabels = {
    atk: "Atk",
    def: "Def",
    spa: "SpA",
    spd: "SpD",
  } as const;

  for (const statKey of ["atk", "def", "spa", "spd"] as const) {
    if (attackerBoosts[statKey] !== 0) {
      assumptions.push(
        `Attacker stage: ${attackerBoosts[statKey] > 0 ? "+" : ""}${attackerBoosts[statKey]} ${statLabels[statKey]}`,
      );
    }
  }

  for (const statKey of ["atk", "def", "spa", "spd"] as const) {
    if (defenderBoosts[statKey] !== 0) {
      assumptions.push(
        `Defender stage: ${defenderBoosts[statKey] > 0 ? "+" : ""}${defenderBoosts[statKey]} ${statLabels[statKey]}`,
      );
    }
  }

  if (attackerBoosts.spe !== 0) {
    assumptions.push(
      `Attacker speed stage: ${attackerBoosts.spe > 0 ? "+" : ""}${attackerBoosts.spe} Spe`,
    );
  }

  if (defenderBoosts.spe !== 0) {
    assumptions.push(
      `Defender speed stage: ${defenderBoosts.spe > 0 ? "+" : ""}${defenderBoosts.spe} Spe`,
    );
  }

  if (attackerItem) {
    assumptions.push(
      attackerItemSource === "prompt"
        ? `Item: ${attackerItem}`
        : attackerItemSource === "set"
          ? `Set item: ${attackerItem}`
          : `Assumed item: ${attackerItem}`,
    );
  }

  if (defenderItem) {
    assumptions.push(
      defenderItemSource === "prompt"
        ? `Defender item: ${defenderItem}`
        : defenderItemSource === "set"
          ? `Defender set item: ${defenderItem}`
          : `Assumed defender item: ${defenderItem}`,
    );
  }

  if (normalizeId(parsed.attacker) !== normalizeId(attackerSpeciesName)) {
    assumptions.push(`Mega Evolution: ${attackerSpeciesName}`);
  }

  if (normalizeId(parsed.defender) !== normalizeId(defenderSpeciesName)) {
    assumptions.push(`Defender form: ${defenderSpeciesName}`);
  }

  if (parsed.attackerCurrentHpPercent !== undefined) {
    assumptions.push(`Attacker HP: ${parsed.attackerCurrentHpPercent}%`);
  }

  if (parsed.defenderCurrentHpPercent !== undefined) {
    assumptions.push(`Defender HP: ${parsed.defenderCurrentHpPercent}%`);
  }

  if (parsed.attackerStatus) {
    assumptions.push(`Attacker status: ${formatStatusLabel(parsed.attackerStatus)}`);
  }

  if (parsed.defenderStatus) {
    assumptions.push(`Defender status: ${formatStatusLabel(parsed.defenderStatus)}`);
  }

  if (attackerSet) {
    assumptions.push(`Set SPs: ${attackerSet.statPoints.hp}/${attackerSet.statPoints.atk}/${attackerSet.statPoints.def}/${attackerSet.statPoints.spa}/${attackerSet.statPoints.spd}/${attackerSet.statPoints.spe}`);
  }

  if (defenderSet) {
    assumptions.push(`Defender SPs: ${defenderSet.statPoints.hp}/${defenderSet.statPoints.atk}/${defenderSet.statPoints.def}/${defenderSet.statPoints.spa}/${defenderSet.statPoints.spd}/${defenderSet.statPoints.spe}`);
  }

  if (attackerAbility && (attackerAbilitySource !== "default" || isRelevantAbility(
    attackerAbility,
    "attacker",
    moveType,
    moveCategory,
    hasWeatherBoost,
    hasTerrainBoost,
  ))) {
    assumptions.push(
      attackerAbilitySource === "prompt"
        ? `Ability: ${attackerAbility}`
        : attackerAbilitySource === "set"
          ? `Set ability: ${attackerAbility}`
          : `Assumed ability: ${attackerAbility}`,
    );
  }

  if (defenderAbility && (defenderAbilitySource !== "default" || isRelevantAbility(
    defenderAbility,
    "defender",
    moveType,
    moveCategory,
    hasWeatherBoost,
    hasTerrainBoost,
  ))) {
    assumptions.push(
      defenderAbilitySource === "prompt"
        ? `Defender ability: ${defenderAbility}`
        : defenderAbilitySource === "set"
          ? `Defender set ability: ${defenderAbility}`
          : `Assumed defender ability: ${defenderAbility}`,
    );
  }

  if (parsed.isDoubleTarget) {
    assumptions.push("Spread move: 0.75x doubles modifier");
  } else if (isSpreadMoveSingleTarget) {
    assumptions.push("Spread move: single target");
  }

  if (lastRespectsStacks !== undefined) {
    assumptions.push(`Last Respects stacks: ${lastRespectsStacks}`);
  }

  if (parsed.moveHitCount && resolvedMoveHitCount && resolvedMoveHitCount > 1) {
    assumptions.push(
      `Hits: ${resolvedMoveHitCount}`,
    );
  } else if (isVariableHitMove && resolvedMoveHitCount && resolvedMoveHitCount > 1) {
    assumptions.push(`Assumed hits: ${resolvedMoveHitCount}`);
  }

  if (parsed.isCriticalHit) {
    assumptions.push("Critical hit");
  }

  if (hasMegaSolOverride) {
    assumptions.push("Mega Sol: attacker move is treated as Sun weather");
  }

  if (speedContext) {
    assumptions.push(`Attacker Spe: ${speedContext.attackerSpeed}`);
    assumptions.push(`Defender Spe: ${speedContext.defenderSpeed}`);

    if (speedContext.ratio !== undefined) {
      assumptions.push(`Speed ratio: ${speedContext.ratio.toFixed(2)}x`);
    }
  }

  return assumptions;
}

export function getCalculationIssues(
  parsed: ParsedCommand,
  importedSets: Record<string, ImportedSet> = {},
) {
  void parsed;
  void importedSets;
  return [];
}

export function buildCalculationContext(
  parsed: ParsedCommand,
  importedSets: Record<string, ImportedSet> = {},
) {
  const parsedAttacker = pokemonById.get(normalizeId(parsed.attacker));
  const parsedDefender = pokemonById.get(normalizeId(parsed.defender));
  const move = moveById.get(normalizeId(parsed.move));

  if (!parsedAttacker || !parsedDefender || !move) {
    return null;
  }

  const attacker = parsedAttacker;
  const defender = parsedDefender;
  const parsedAttackerSet = resolveReferencedImportedSet(
    parsed.attackerSetReferenceId,
    importedSets,
  );
  const parsedDefenderSet = resolveReferencedImportedSet(
    parsed.defenderSetReferenceId,
    importedSets,
  );
  const requiresTargetItem = normalizeId(move.name) === "poltergeist";
  const attackerItem = parsed.attackerItem ?? parsedAttackerSet?.item;
  const defenderItem = getResolvedDefenderItem(
    parsed,
    parsedDefenderSet,
    defender.id,
    requiresTargetItem,
  );
  const attackerSet = buildPromptStatPointSet(
    attacker.id,
    attacker.name,
    parsedAttackerSet,
    parsed.attackerStatPoints,
    attackerItem,
    parsed.attackerAbility ?? parsedAttackerSet?.ability,
    parsed.attackerNature ?? parsedAttackerSet?.nature,
  );
  const defenderSet = buildPromptStatPointSet(
    defender.id,
    defender.name,
    parsedDefenderSet,
    parsed.defenderStatPoints,
    defenderItem,
    parsed.defenderAbility ?? parsedDefenderSet?.ability,
    parsed.defenderNature ?? parsedDefenderSet?.nature,
  );

  const isPhysical = move.category === "Physical";
  const attackingStatKey = resolveAttackingStatKey(move.id, move.category);
  const { attackerBoosts, defenderBoosts } = buildAppliedStageBoosts(
    parsed,
    move.category,
  );
  const attackInvestment =
    parsed.attackerInvestment === "max_atk"
      ? "atk"
      : parsed.attackerInvestment === "max_spa"
        ? "spa"
        : attackingStatKey === "def"
          ? "def"
          : isPhysical
          ? "atk"
          : "spa";
  const attackerItemSource: ValueSource = parsed.attackerItem
    ? "prompt"
    : attackerSet?.item
      ? "set"
      : "default";
  const defenderItemSource: ValueSource = parsed.defenderItem
    ? "prompt"
    : defenderSet?.item
      ? "set"
      : "default";
  const attackerAbility = getResolvedAttackerAbility(
    parsed,
    attackerSet,
    attacker.id,
  );
  const defenderAbility = getResolvedDefenderAbility(
    parsed,
    defenderSet,
    defender.id,
  );
  const { moveHitMetadata, moveHitCount } = getResolvedMoveHitCount(parsed);
  const attackerAbilitySource: ValueSource = parsed.attackerAbility
    ? "prompt"
    : attackerSet?.ability
      ? "set"
      : "default";
  const defenderAbilitySource: ValueSource = parsed.defenderAbility
    ? "prompt"
    : defenderSet?.ability
      ? "set"
      : "default";
  const field = new Field({
    gameType: "Doubles",
    weather: getEffectiveWeather(parsed, attackerAbility),
    terrain: getTerrain(parsed),
    isGravity: parsed.globalEffects.includes("gravity"),
    attackerSide: {
      isHelpingHand: parsed.attackerSideEffects.includes("helping_hand"),
      isTailwind: parsed.attackerSideEffects.includes("tailwind"),
      isBattery: parsed.attackerSideEffects.includes("battery"),
      isPowerSpot: parsed.attackerSideEffects.includes("power_spot"),
    },
    defenderSide: {
      isReflect: parsed.defenderSideEffects.includes("reflect"),
      isLightScreen: parsed.defenderSideEffects.includes("light_screen"),
      isAuroraVeil: parsed.defenderSideEffects.includes("aurora_veil"),
      isProtected: parsed.defenderSideEffects.includes("protect"),
      isFriendGuard: parsed.defenderSideEffects.includes("friend_guard"),
      isTailwind: parsed.defenderSideEffects.includes("tailwind"),
    },
    ...buildAbilityFlags(attackerAbility, defenderAbility),
  });

  const attackerBaseOptions = {
    level: attackerSet?.level ?? 50,
    ability: attackerAbility,
    item: attackerItem,
    nature: parsed.attackerNature ?? attackerSet?.nature ?? "Hardy",
    ivs: buildBaseIvs(),
    evs: parsed.attackerStatPoints
      ? statPointsToCalcEvs(parsed.attackerStatPoints)
      : buildBaseEvs(attackerSet, {
        hp: 4,
        atk: attackInvestment === "atk" ? 252 : 0,
        def: attackInvestment === "def" ? 252 : 0,
        spa: attackInvestment === "spa" ? 252 : 0,
        spd: 0,
        spe: 0,
      }),
    boosts: {
      atk: attackerBoosts.atk,
      def: attackerBoosts.def,
      spa: attackerBoosts.spa,
      spd: attackerBoosts.spd,
      spe: attackerBoosts.spe,
    },
    status: parsed.attackerStatus,
    moves: [parsed.move],
  };
  const attackerPreviewResult = createCalcPokemon(
    attacker,
    "attacker",
    attackerBaseOptions,
    parsed.attackerCalcFormId,
  );

  if (!attackerPreviewResult) {
    return null;
  }

  const attackerPokemonResult = createCalcPokemon(attacker, "attacker", {
    ...attackerBaseOptions,
    curHP: toCurrentHp(
      attackerPreviewResult.pokemon.maxHP(),
      parsed.attackerCurrentHpPercent,
    ),
  }, parsed.attackerCalcFormId);

  if (!attackerPokemonResult) {
    return null;
  }

  const defenderSpeedNature = defenderSet
    ? parsed.defenderNature ?? defenderSet.nature
    : parsed.defenderNature ?? "Hardy";
  const defenderSpeedIvs = buildBaseIvs();
  const defenderSpeedEvs = parsed.defenderStatPoints
    ? statPointsToCalcEvs(parsed.defenderStatPoints)
    : buildBaseEvs(defenderSet, EMPTY_STAT_SPREAD);
  const attackerSpeedContext = buildEffectiveSpeed(attacker, {
    evs: attackerBaseOptions.evs,
    ivs: attackerBaseOptions.ivs,
    nature: attackerBaseOptions.nature,
    level: attackerBaseOptions.level,
    speedStage: attackerBoosts.spe,
    status: parsed.attackerStatus,
    hasTailwind: parsed.attackerSideEffects.includes("tailwind"),
    ability: attackerAbility,
    item: attackerItem,
    weather: getEffectiveWeather(parsed, attackerAbility),
    terrain: getTerrain(parsed),
  });
  const defenderSpeedContext = buildEffectiveSpeed(defender, {
    evs: defenderSpeedEvs,
    ivs: defenderSpeedIvs,
    nature: defenderSpeedNature,
    level: defenderSet?.level ?? 50,
    speedStage: defenderBoosts.spe,
    status: parsed.defenderStatus,
    hasTailwind: parsed.defenderSideEffects.includes("tailwind"),
    ability: defenderAbility,
    item: defenderItem,
    weather: getEffectiveWeather(parsed, attackerAbility),
    terrain: getTerrain(parsed),
  });
  const shouldIncludeSpeedContext = shouldDescribeSpeedContext(
    parsed,
    move.name,
    attackerAbility,
    defenderAbility,
    attackerItem,
    defenderItem,
  );
  const speedRatio =
    normalizeId(move.name) === "electroball"
      ? attackerSpeedContext.effectiveSpeed > 0 && defenderSpeedContext.effectiveSpeed > 0
        ? attackerSpeedContext.effectiveSpeed / defenderSpeedContext.effectiveSpeed
        : undefined
      : normalizeId(move.name) === "gyroball"
        ? attackerSpeedContext.effectiveSpeed > 0 && defenderSpeedContext.effectiveSpeed > 0
          ? defenderSpeedContext.effectiveSpeed / attackerSpeedContext.effectiveSpeed
          : undefined
        : undefined;

  return {
    attacker,
    defender,
    move,
    field,
    attackerPokemon: attackerPokemonResult.pokemon,
    attackerCalcSpeciesName: attackerPokemonResult.calcSpeciesName,
    defenderCalcSpeciesName: resolveCalcSpeciesName(
      defender,
      "defender",
      parsed.defenderCalcFormId,
    ),
    attackerItem,
    defenderItem,
    attackerSet,
    defenderSet,
    attackerAbility,
    defenderAbility,
    archetypes: defenderSet
      ? [
        buildCustomSetArchetypeConfig({
          ...defenderSet,
          nature: parsed.defenderNature ?? defenderSet.nature,
          item: defenderItem,
          ability: defenderAbility,
        }),
      ]
      : getArchetypeConfigs(
        defender,
        move.category as "Physical" | "Special",
        parsed.defenderNature,
        parsed.defenderInvestment ?? "auto",
      ),
    assumptions: describeAssumptions(
      parsed,
      attacker.name,
      defender.name,
      attackerItem,
      defenderItem,
      attackerItemSource,
      defenderItemSource,
      attackerAbility,
      defenderAbility,
      attackerAbilitySource,
      defenderAbilitySource,
      move.type,
      move.category,
      attackerSet,
      defenderSet,
      moveHitCount,
      moveHitMetadata.isVariable,
      shouldIncludeSpeedContext
        ? {
          attackerSpeed: attackerSpeedContext.effectiveSpeed,
          defenderSpeed: defenderSpeedContext.effectiveSpeed,
          ratio: speedRatio,
        }
        : undefined,
      hasMegaSolWeatherOverride(attackerAbility),
      normalizeId(move.name) === "lastrespects"
        ? parsed.lastRespectsStacks
        : undefined,
      move.isSpread && !parsed.isDoubleTarget,
    ),
    moveHitCount,
  };
}

export function calculateDamageResults(
  parsed: ParsedCommand,
  importedSets: Record<string, ImportedSet> = {},
): DamageResult[] {
  const context = buildCalculationContext(parsed, importedSets);

  if (!context) {
    return [];
  }

  return context.archetypes.flatMap((archetype): DamageResult[] => {
    const { defenderBoosts } = buildAppliedStageBoosts(
      parsed,
      context.move.category,
    );
    const defenderLevel = context.defenderSet?.level ?? 50;
    const defenderNature = context.defenderSet
      ? parsed.defenderNature ?? context.defenderSet.nature
      : archetype.nature;
    const defenderIvs = cloneStatSpread(archetype.ivs, DEFAULT_IV_SPREAD);
    const defenderEvs = cloneStatSpread(
      archetype.evs,
      context.defenderSet?.evs ?? EMPTY_STAT_SPREAD,
    );
    const defenderBaseOptions = {
      level: defenderLevel,
      ability: context.defenderAbility,
      item: context.defenderItem,
      nature: defenderNature,
      ivs: defenderIvs,
      evs: defenderEvs,
      boosts: {
        atk: parsed.defenderStageMods.atk,
        def: defenderBoosts.def,
        spa: parsed.defenderStageMods.spa,
        spd: defenderBoosts.spd,
        spe: defenderBoosts.spe,
      },
      status: parsed.defenderStatus,
    };
    const defenderPreviewResult = createCalcPokemon(
      context.defender,
      "defender",
      defenderBaseOptions,
      parsed.defenderCalcFormId,
    );

    if (!defenderPreviewResult || !context.defenderCalcSpeciesName) {
      return [];
    }

    const defenderPokemonResult = createCalcPokemon(context.defender, "defender", {
      ...defenderBaseOptions,
      curHP: toCurrentHp(
        defenderPreviewResult.pokemon.maxHP(),
        parsed.defenderCurrentHpPercent,
      ),
    }, parsed.defenderCalcFormId);

    if (!defenderPokemonResult) {
      return [];
    }

    const defenderPokemon = defenderPokemonResult.pokemon;

    const moveOverrides = {
      ...(normalizeId(parsed.move) === "lastrespects" &&
      parsed.lastRespectsStacks !== undefined
        ? { basePower: 50 * (parsed.lastRespectsStacks + 1) }
        : {}),
      ...(context.move.isSpread && !parsed.isDoubleTarget
        ? { target: "normal" as const }
        : {}),
    };
    const calcMove = new Move(9, parsed.move, {
      ability: context.attackerAbility,
      hits: context.moveHitCount,
      item: context.attackerItem,
      isCrit: parsed.isCriticalHit,
      overrides: Object.keys(moveOverrides).length
        ? moveOverrides
        : undefined,
      species: context.attackerCalcSpeciesName,
    });
    const result = calculate(
      9,
      context.attackerPokemon,
      defenderPokemon,
      calcMove,
      context.field,
    );
    const [minDamage, maxDamage] = result.range();
    const maxHP = defenderPokemon.maxHP();
    const description = describeResultSafely(
      result,
      context.attacker.name,
      context.defender.name,
      parsed.move,
      minDamage,
      maxDamage,
      maxHP,
    );

    return [
      {
      archetype: archetype.archetype,
      ...(archetype.label !== undefined ? { label: archetype.label } : {}),
      summary: archetype.summary,
      minPercentage: roundPercent((minDamage / maxHP) * 100),
      maxPercentage: roundPercent((maxDamage / maxHP) * 100),
      koChanceText: description.koChanceText,
      showdownText: description.showdownText,
      contextText: description.contextText,
      damageText: description.damageText,
      damageRolls: buildDamageRolls(result.damage, maxHP),
      assumptions: context.assumptions,
      },
    ];
  });
}
