import { Field, Move, Pokemon, calculate } from "@smogon/calc";

import { getArchetypeConfigs } from "@/lib/calc/archetypes";
import { normalizeKoText } from "@/lib/calc/ko-text";
import { moveById, normalizeId, pokemonById } from "@/lib/data/loaders";
import { inferDefaultAbility } from "@/lib/parser/inference";
import type { DamageResult, ParsedCommand } from "@/lib/types";

function roundPercent(value: number) {
  return Number(value.toFixed(1));
}

function toCurrentHp(maxHP: number, percent: number | undefined) {
  if (!percent || percent >= 100) {
    return maxHP;
  }

  return Math.max(1, Math.round((maxHP * percent) / 100));
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

function deriveKoText(damageText: string) {
  const separatorIndex = damageText.indexOf("--");
  if (separatorIndex === -1) {
    return "Damage range";
  }

  return normalizeKoText(damageText.slice(separatorIndex + 2).trim());
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
  attackerAbility: string | undefined,
  defenderAbility: string | undefined,
  moveType: string,
  moveCategory: string,
) {
  const assumptions: string[] = [];
  const hasWeatherBoost = parsed.globalEffects.includes("sun");
  const hasTerrainBoost = parsed.globalEffects.includes("electric_terrain");
  const attackerAbilityExplicit = Boolean(parsed.attackerAbility);
  const defenderAbilityExplicit = Boolean(parsed.defenderAbility);
  const attackerStageStat = moveCategory === "Physical" ? "Atk" : "SpA";
  const defenderStageStat = moveCategory === "Physical" ? "Def" : "SpD";

  if (parsed.attackerStatMod !== 0) {
    assumptions.push(
      `Attacker stage: ${parsed.attackerStatMod > 0 ? "+" : ""}${parsed.attackerStatMod} ${attackerStageStat}`,
    );
  }

  if (parsed.defenderStatMod !== 0) {
    assumptions.push(
      `Defender stage: ${parsed.defenderStatMod > 0 ? "+" : ""}${parsed.defenderStatMod} ${defenderStageStat}`,
    );
  }

  if (parsed.attackerItem) {
    assumptions.push(`Item: ${parsed.attackerItem}`);
  }

  if (parsed.attackerCurrentHpPercent !== undefined) {
    assumptions.push(`Attacker HP: ${parsed.attackerCurrentHpPercent}%`);
  }

  if (parsed.defenderCurrentHpPercent !== undefined) {
    assumptions.push(`Defender HP: ${parsed.defenderCurrentHpPercent}%`);
  }

  if (attackerAbility && (attackerAbilityExplicit || isRelevantAbility(
    attackerAbility,
    "attacker",
    moveType,
    moveCategory,
    hasWeatherBoost,
    hasTerrainBoost,
  ))) {
    assumptions.push(
      attackerAbilityExplicit
        ? `Ability: ${attackerAbility}`
        : `Assumed ability: ${attackerAbility}`,
    );
  }

  if (defenderAbility && (defenderAbilityExplicit || isRelevantAbility(
    defenderAbility,
    "defender",
    moveType,
    moveCategory,
    hasWeatherBoost,
    hasTerrainBoost,
  ))) {
    assumptions.push(
      defenderAbilityExplicit
        ? `Defender ability: ${defenderAbility}`
        : `Assumed defender ability: ${defenderAbility}`,
    );
  }

  if (parsed.globalEffects.includes("trick_room")) {
    assumptions.push("Trick Room: attacker uses 0 Spe IV");
  }

  if (parsed.isDoubleTarget) {
    assumptions.push("Spread move: 0.75x doubles modifier");
  }

  if (parsed.isCriticalHit) {
    assumptions.push("Critical hit");
  }

  return assumptions;
}

export function buildCalculationContext(parsed: ParsedCommand) {
  const attacker = pokemonById.get(normalizeId(parsed.attacker));
  const defender = pokemonById.get(normalizeId(parsed.defender));
  const move = moveById.get(normalizeId(parsed.move));

  if (!attacker || !defender || !move) {
    return null;
  }

  const isPhysical = move.category === "Physical";
  const attackInvestment =
    parsed.attackerInvestment === "max_atk"
      ? "atk"
      : parsed.attackerInvestment === "max_spa"
        ? "spa"
        : isPhysical
          ? "atk"
          : "spa";
  const attackerAbility = parsed.attackerAbility ?? inferDefaultAbility(attacker.id) ?? undefined;
  const defenderAbility = parsed.defenderAbility ?? inferDefaultAbility(defender.id) ?? undefined;
  const field = new Field({
    gameType: "Doubles",
    weather: getWeather(parsed),
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
    level: 50,
    ability: attackerAbility,
    item: parsed.attackerItem,
    nature: parsed.attackerNature ?? "Hardy",
    ivs: {
      hp: 31,
      atk: 31,
      def: 31,
      spa: 31,
      spd: 31,
      spe: parsed.globalEffects.includes("trick_room") ? 0 : 31,
    },
    evs: {
      hp: 4,
      atk: attackInvestment === "atk" ? 252 : 0,
      def: 0,
      spa: attackInvestment === "spa" ? 252 : 0,
      spd: 0,
      spe: 0,
    },
    boosts: {
      atk: move.category === "Physical" ? parsed.attackerStatMod : 0,
      spa: move.category === "Special" ? parsed.attackerStatMod : 0,
    },
    moves: [parsed.move],
  };
  const attackerPreview = new Pokemon(9, attacker.name, attackerBaseOptions);
  const attackerPokemon = new Pokemon(9, attacker.name, {
    ...attackerBaseOptions,
    curHP: toCurrentHp(attackerPreview.maxHP(), parsed.attackerCurrentHpPercent),
  });

  return {
    attacker,
    defender,
    move,
    field,
    attackerPokemon,
    attackerAbility,
    defenderAbility,
    archetypes: getArchetypeConfigs(
      defender,
      parsed.defenderNature,
      parsed.defenderInvestment ?? "auto",
    ),
    assumptions: describeAssumptions(
      parsed,
      attackerAbility,
      defenderAbility,
      move.type,
      move.category,
    ),
  };
}

export function calculateDamageResults(parsed: ParsedCommand): DamageResult[] {
  const context = buildCalculationContext(parsed);

  if (!context) {
    return [];
  }

  return context.archetypes.map((archetype) => {
    const defenderPokemon = new Pokemon(9, context.defender.name, {
      curHP: toCurrentHp(
        new Pokemon(9, context.defender.name, {
          level: 50,
          ability: context.defenderAbility,
          nature: archetype.nature,
          ivs: {
            hp: 31,
            atk: 31,
            def: 31,
            spa: 31,
            spd: 31,
            spe: 31,
          },
          evs: {
            hp: archetype.evs.hp,
            atk: 0,
            def: archetype.evs.def,
            spa: 0,
            spd: archetype.evs.spd,
            spe: 0,
          },
          boosts: {
            def: context.move.category === "Physical" ? parsed.defenderStatMod : 0,
            spd: context.move.category === "Special" ? parsed.defenderStatMod : 0,
          },
        }).maxHP(),
        parsed.defenderCurrentHpPercent,
      ),
      level: 50,
      ability: context.defenderAbility,
      nature: archetype.nature,
      ivs: {
        hp: 31,
        atk: 31,
        def: 31,
        spa: 31,
        spd: 31,
        spe: 31,
      },
      evs: {
        hp: archetype.evs.hp,
        atk: 0,
        def: archetype.evs.def,
        spa: 0,
        spd: archetype.evs.spd,
        spe: 0,
      },
      boosts: {
        def: context.move.category === "Physical" ? parsed.defenderStatMod : 0,
        spd: context.move.category === "Special" ? parsed.defenderStatMod : 0,
      },
    });

    const result = calculate(
      9,
      context.attackerPokemon,
      defenderPokemon,
      new Move(9, parsed.move, {
        ability: context.attackerAbility,
        item: parsed.attackerItem,
        isCrit: parsed.isCriticalHit,
        species: context.attacker.name,
      }),
      context.field,
    );
    const [minDamage, maxDamage] = result.range();
    const maxHP = defenderPokemon.maxHP();
    const showdownText = result.desc();
    const { contextText, damageText } = splitShowdownText(showdownText);

    return {
      archetype: archetype.archetype,
      minPercentage: roundPercent((minDamage / maxHP) * 100),
      maxPercentage: roundPercent((maxDamage / maxHP) * 100),
      koChanceText: deriveKoText(damageText),
      showdownText,
      contextText,
      damageText,
      assumptions: context.assumptions,
    };
  });
}
