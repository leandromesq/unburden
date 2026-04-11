import {
  allowedItemIds,
  itemDisplayById,
  moveById,
  normalizeAlias,
  normalizeId,
  vgcMetaByPokemonId,
} from "@/lib/data/loaders";
import { analyzeCommandStructure, isKnownModifierToken } from "@/lib/parser/command-structure";
import {
  ATTACKER_MODIFIER_MAP,
  ATTACKER_NEGATIVE_NATURE,
  ATTACKER_POSITIVE_NATURE,
  DEFENDER_NEGATIVE_NATURE,
  DEFENDER_MODIFIER_MAP,
  DEFENDER_POSITIVE_NATURE,
  GLOBAL_MODIFIER_MAP,
  buildCommonAbilities,
} from "@/lib/parser/grammar";
import { resolveMoveEntity } from "@/lib/parser/fuse-indexes";
import type { ParsedCommand, PokemonEntry } from "@/lib/types";

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
) {
  if (segment.speciesExact) {
    return segment.speciesExact;
  }

  if (segment.leadingRemainderTokens.length === 0) {
    return segment.speciesMatch;
  }

  return null;
}

function resolveMoveName(moveInput: string) {
  const exact = moveById.get(normalizeId(moveInput));
  if (exact) {
    return exact;
  }

  const looseQuery = moveInput.replace(/-/g, " ");
  return resolveMoveEntity(looseQuery)?.entry ?? null;
}

function resolveItemDisplay(itemInput: string | undefined) {
  if (!itemInput) {
    return undefined;
  }

  const normalized = normalizeId(itemInput);
  if (!allowedItemIds.has(normalized)) {
    return undefined;
  }

  return itemDisplayById.get(normalized) ?? itemInput;
}

function resolveAbilityName(
  pokemon: PokemonEntry,
  abilityInput: string | undefined,
) {
  if (!abilityInput) {
    return undefined;
  }

  const profile = vgcMetaByPokemonId.get(pokemon.id);
  const abilities = buildCommonAbilities(profile, pokemon.abilities);
  const normalizedInput = normalizeAlias(abilityInput);

  return abilities.find((ability) => normalizeAlias(ability) === normalizedInput);
}

function parseModifierCollections(
  attackerTokens: string[],
  defenderTokens: string[],
  globalTokens: string[],
) {
  let attackerStatMod = 0;
  let defenderStatMod = 0;
  let attackerSpeedMod = 0;
  let defenderSpeedMod = 0;
  let attackerNature: string | undefined;
  let defenderNature: string | undefined;
  let attackerStatus: ParsedCommand["attackerStatus"];
  let defenderStatus: ParsedCommand["defenderStatus"];
  let attackerInvestment: ParsedCommand["attackerInvestment"] = "auto";
  let defenderInvestment: ParsedCommand["defenderInvestment"] = "auto";
  const attackerSideEffects = new Set<ParsedCommand["attackerSideEffects"][number]>();
  const defenderSideEffects = new Set<ParsedCommand["defenderSideEffects"][number]>();
  const globalEffects = new Set<ParsedCommand["globalEffects"][number]>();

  for (const token of attackerTokens) {
    const definition = ATTACKER_MODIFIER_MAP.get(token);
    if (!definition) {
      continue;
    }

    if (definition.kind === "stat_mod") {
      attackerStatMod += definition.statMod ?? 0;
    } else if (definition.kind === "speed_mod") {
      attackerSpeedMod += definition.statMod ?? 0;
    } else if (definition.kind === "nature") {
      attackerNature = definition.nature;
    } else if (definition.kind === "status") {
      attackerStatus = definition.status;
    } else if (definition.kind === "investment") {
      attackerInvestment = definition.investment as ParsedCommand["attackerInvestment"];
    } else if (definition.kind === "side_effect" && definition.sideEffect) {
      attackerSideEffects.add(definition.sideEffect);
    }
  }

  for (const token of defenderTokens) {
    const definition = DEFENDER_MODIFIER_MAP.get(token);
    if (!definition) {
      continue;
    }

    if (definition.kind === "stat_mod") {
      defenderStatMod += definition.statMod ?? 0;
    } else if (definition.kind === "speed_mod") {
      defenderSpeedMod += definition.statMod ?? 0;
    } else if (definition.kind === "nature") {
      defenderNature = definition.nature;
    } else if (definition.kind === "status") {
      defenderStatus = definition.status;
    } else if (definition.kind === "investment") {
      defenderInvestment = definition.investment as ParsedCommand["defenderInvestment"];
    } else if (definition.kind === "side_effect" && definition.sideEffect) {
      defenderSideEffects.add(definition.sideEffect);
    }
  }

  for (const token of globalTokens) {
    const definition = GLOBAL_MODIFIER_MAP.get(token);
    if (definition?.globalEffect) {
      globalEffects.add(definition.globalEffect);
    }
  }

  return {
    attackerStatMod: Math.max(-6, Math.min(6, attackerStatMod)),
    defenderStatMod: Math.max(-6, Math.min(6, defenderStatMod)),
    attackerSpeedMod: Math.max(-6, Math.min(6, attackerSpeedMod)),
    defenderSpeedMod: Math.max(-6, Math.min(6, defenderSpeedMod)),
    attackerNature,
    defenderNature,
    attackerStatus,
    defenderStatus,
    attackerInvestment,
    defenderInvestment,
    attackerSideEffects: Array.from(attackerSideEffects),
    defenderSideEffects: Array.from(defenderSideEffects),
    globalEffects: Array.from(globalEffects),
  };
}

function resolveAttackerNature(
  nature: string | undefined,
  moveCategory: string,
) {
  if (nature === ATTACKER_POSITIVE_NATURE) {
    return moveCategory === "Physical" ? "Adamant" : "Modest";
  }

  if (nature === ATTACKER_NEGATIVE_NATURE) {
    return moveCategory === "Physical" ? "Modest" : "Adamant";
  }

  return nature;
}

function resolveDefenderNature(
  nature: string | undefined,
  moveCategory: string,
) {
  if (nature === DEFENDER_POSITIVE_NATURE) {
    return moveCategory === "Physical" ? "Bold" : "Calm";
  }

  if (nature === DEFENDER_NEGATIVE_NATURE) {
    return moveCategory === "Physical" ? "Mild" : "Rash";
  }

  return nature;
}

function resolveCurrentHpPercent(tokenValue: string | undefined) {
  if (!tokenValue) {
    return undefined;
  }

  const value = Number(tokenValue);
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(1, Math.min(100, value));
}

interface CommandParseResult {
  parsed: ParsedCommand | null;
  issues: string[];
}

function isLegacyScopedToken(token: string) {
  return /^(?:[adg]:|>|<)/i.test(token);
}

export function parseCommand(input: string): CommandParseResult {
  const structure = analyzeCommandStructure(input);
  const issues: string[] = [];
  const attackerMatch = resolveParsedSpecies(structure.attacker);
  const defenderMatch = resolveParsedSpecies(structure.defender);
  const moveToken = structure.attacker.moveToken;
  const move = moveToken ? resolveMoveName(moveToken.value) : null;
  const attackerItem = resolveItemDisplay(structure.attacker.itemToken?.value);
  const defenderItem = resolveItemDisplay(structure.defender.itemToken?.value);

  if (!structure.lexed.hasDelimiter) {
    issues.push("Use x to split attacker and defender.");
  }

  if (!attackerMatch) {
    issues.push("Could not resolve attacker.");
  }

  if (structure.lexed.hasDelimiter && !defenderMatch) {
    issues.push("Could not resolve defender.");
  }

  if (structure.attacker.postExplicitFreeTokens.length) {
    issues.push(
      "Attacker tokens after !move must use known segment-scoped forms like @item, %75, [Ability], +1, +nature, or helping-hand.",
    );
  }

  if (structure.defender.postExplicitFreeTokens.length) {
    issues.push(
      "Defender tokens must use known segment-scoped forms like @item, %75, [Ability], +1, +nature, or reflect.",
    );
  }

  if (structure.attacker.leadingRemainderTokens.length && !moveToken) {
    issues.push("Use !<move> for the attacker move.");
  }

  if (!moveToken) {
    issues.push("Add an explicit attacker move with !<move>.");
  } else if (!move) {
    issues.push("Could not resolve attacker move.");
  }

  if (moveToken?.hitCountInvalid) {
    issues.push("Move hit count must be between 1 and 10.");
  }

  if (structure.defender.leadingRemainderTokens.length) {
    issues.push(
      "Unrecognized defender token. Use segment-scoped tokens like @item, %75, [Ability], +nature, reflect, or ~rain.",
    );
  }

  if (structure.attacker.misplacedTokens.length || structure.defender.misplacedTokens.length) {
    issues.push("Some tokens were placed on the wrong side of the separator.");
  }

  const unknownTokens = [
    ...structure.attacker.modifierTokens.filter(
      (token) => !isKnownModifierToken("attacker", token.value),
    ),
    ...structure.defender.modifierTokens.filter(
      (token) => !isKnownModifierToken("defender", token.value),
    ),
    ...structure.globalTokens.filter(
      (token) => !isKnownModifierToken("global", token.value),
    ),
  ];

  if (unknownTokens.length) {
    issues.push(`Unknown modifier token: ${unknownTokens[0].raw}`);
  }

  if (structure.attacker.itemToken && !attackerItem) {
    issues.push(`Unknown attacker item: ${structure.attacker.itemToken.raw}`);
  }

  if (structure.defender.itemToken && !defenderItem) {
    issues.push(`Unknown defender item: ${structure.defender.itemToken.raw}`);
  }

  const legacyTokens = [
    ...structure.attacker.leadingRemainderTokens,
    ...structure.attacker.postExplicitFreeTokens,
    ...structure.defender.leadingRemainderTokens,
    ...structure.defender.postExplicitFreeTokens,
  ].filter((token) => isLegacyScopedToken(token.raw));

  if (legacyTokens.length) {
    issues.push("Legacy prefixes >, <, a:, d:, and g: are no longer supported.");
  }

  if (!attackerMatch || !defenderMatch || !move || legacyTokens.length || moveToken?.hitCountInvalid) {
    return { parsed: null, issues: unique(issues) };
  }

  const attackerAbility = resolveAbilityName(
    attackerMatch.entry,
    structure.attacker.abilityToken?.value,
  );
  const defenderAbility = resolveAbilityName(
    defenderMatch.entry,
    structure.defender.abilityToken?.value,
  );
  const attackerCurrentHpPercent = resolveCurrentHpPercent(structure.attacker.hpToken?.value);
  const defenderCurrentHpPercent = resolveCurrentHpPercent(structure.defender.hpToken?.value);
  const isCriticalHit = Boolean(
    structure.attacker.criticalToken || structure.defender.criticalToken,
  );

  if (structure.attacker.abilityToken && !attackerAbility) {
    issues.push("Could not resolve attacker ability.");
  }

  if (structure.defender.abilityToken && !defenderAbility) {
    issues.push("Could not resolve defender ability.");
  }

  const modifiers = parseModifierCollections(
    structure.attacker.modifierTokens.map((token) => token.value),
    structure.defender.modifierTokens.map((token) => token.value),
    structure.globalTokens.map((token) => token.value),
  );
  const attackerNature = resolveAttackerNature(modifiers.attackerNature, move.category);
  const defenderNature = resolveDefenderNature(modifiers.defenderNature, move.category);

  return {
    parsed: {
      attacker: attackerMatch.entry.name,
      move: move.name,
      defender: defenderMatch.entry.name,
      moveHitCount: moveToken?.hits,
      attackerStatMod: modifiers.attackerStatMod,
      defenderStatMod: modifiers.defenderStatMod,
      attackerSpeedMod: modifiers.attackerSpeedMod,
      defenderSpeedMod: modifiers.defenderSpeedMod,
      attackerCurrentHpPercent,
      defenderCurrentHpPercent,
      attackerStatus: modifiers.attackerStatus,
      defenderStatus: modifiers.defenderStatus,
      isCriticalHit,
      attackerNature,
      attackerAbility,
      attackerItem,
      defenderItem,
      attackerInvestment: modifiers.attackerInvestment,
      defenderNature,
      defenderAbility,
      defenderInvestment: modifiers.defenderInvestment,
      globalEffects: modifiers.globalEffects,
      attackerSideEffects: modifiers.attackerSideEffects,
      defenderSideEffects: modifiers.defenderSideEffects,
      isDoubleTarget: move.isSpread,
    },
    issues: unique(issues),
  };
}
