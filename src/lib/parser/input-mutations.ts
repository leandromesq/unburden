import {
  getNatureEffectDirectionForStat,
  resolveAttackingStatKey,
} from "@/lib/calc/move-stat-context";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import {
  ATTACKER_MODIFIER_MAP,
  DEFENDER_MODIFIER_MAP,
  GLOBAL_MODIFIER_MAP,
  formatAbilityToken,
  formatModifierToken,
  normalizeModifierValue,
  parseAbilitySymbol,
  slugifySymbolValue,
} from "@/lib/parser/grammar";
import { compactWhitespace, joinTokenValues } from "@/lib/parser/tokenize";
import { getCanonicalPromptPokemonName } from "@/lib/data/loaders";
import { resolveSetReferenceToken } from "@/lib/team/set-references";
import type {
  ActiveChipTokens,
  ImportedSet,
  PokemonEntry,
  PokemonStatus,
  StatSpread,
} from "@/lib/types";

export type ChipScope = keyof ActiveChipTokens;
export type SummarySide = "attacker" | "defender";
type AutoFieldCategory = "weather" | "terrain";
type StageStatKey = Exclude<keyof StatSpread, "hp">;

function isLegacyScopedToken(raw: string) {
  return /^(?:[adg]:|>|<)/i.test(raw);
}

export function buildActiveChipTokens(
  structure: ReturnType<typeof analyzeCommandStructure>,
): ActiveChipTokens {
  return {
    attacker: [
      ...structure.attacker.modifierTokens.map((token) =>
        formatModifierToken("attacker", token.value),
      ),
      ...(structure.attacker.hpToken
        ? [`%${structure.attacker.hpToken.value}`]
        : []),
      ...(structure.attacker.abilityToken
        ? [
            formatAbilityToken(
              "attacker",
              structure.attacker.abilityToken.value,
            ),
          ]
        : []),
    ],
    defender: [
      ...structure.defender.modifierTokens.map((token) =>
        formatModifierToken("defender", token.value),
      ),
      ...(structure.defender.hpToken
        ? [`%${structure.defender.hpToken.value}`]
        : []),
      ...(structure.defender.abilityToken
        ? [
            formatAbilityToken(
              "defender",
              structure.defender.abilityToken.value,
            ),
          ]
        : []),
    ],
    global: structure.globalTokens.map((token) =>
      formatModifierToken("global", token.value),
    ),
  };
}

export function toCanonicalScopeToken(scope: ChipScope, raw: string) {
  if (isLegacyScopedToken(raw)) {
    return null;
  }

  if (scope !== "global" && /^%\d{1,3}$/i.test(raw)) {
    return raw;
  }

  const ability = parseAbilitySymbol(
    raw,
    scope === "global" ? undefined : scope,
  );
  if (ability && scope !== "global" && ability.scope === scope) {
    return formatAbilityToken(scope, ability.ability);
  }

  const normalizedValue =
    scope === "global" && raw.startsWith("~")
      ? normalizeModifierValue(raw.slice(1))
      : normalizeModifierValue(raw);

  if (scope === "attacker" && ATTACKER_MODIFIER_MAP.has(normalizedValue)) {
    return formatModifierToken("attacker", normalizedValue);
  }

  if (scope === "defender" && DEFENDER_MODIFIER_MAP.has(normalizedValue)) {
    return formatModifierToken("defender", normalizedValue);
  }

  if (scope === "global" && GLOBAL_MODIFIER_MAP.has(normalizedValue)) {
    return formatModifierToken("global", normalizedValue);
  }

  return null;
}

export function stripGlobalSectionTokens(
  input: string,
  section: AutoFieldCategory,
): string {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = structure.attacker.rawTokens.map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens.map((entry) => entry.raw);
  const baseTokens = structure.lexed.hasDelimiter
    ? [...attackerTokens, "x", ...defenderTokens]
    : attackerTokens;

  return baseTokens
    .filter((raw) => {
      const canonical = toCanonicalScopeToken("global", raw);
      if (canonical === null) return true;

      const tokenValue = canonical.slice(1);
      const definition = GLOBAL_MODIFIER_MAP.get(tokenValue);
      return definition?.section !== section;
    })
    .join(" ")
    .trim();
}

export function removeChipToken(
  input: string,
  scope: ChipScope,
  token: string,
) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = structure.attacker.rawTokens
    .filter((entry) => toCanonicalScopeToken("attacker", entry.raw) !== token)
    .map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens
    .filter((entry) => toCanonicalScopeToken("defender", entry.raw) !== token)
    .map((entry) => entry.raw);
  const baseTokens = structure.lexed.hasDelimiter
    ? [...attackerTokens, "x", ...defenderTokens]
    : attackerTokens;

  if (scope === "global") {
    return baseTokens
      .filter((entry) => toCanonicalScopeToken("global", entry) !== token)
      .join(" ")
      .trim();
  }

  return baseTokens.join(" ").trim();
}

export function insertChipToken(
  input: string,
  scope: ChipScope,
  token: string,
) {
  let normalizedInput = compactWhitespace(input);
  const activeChips = buildActiveChipTokens(
    analyzeCommandStructure(normalizedInput),
  );

  if (activeChips[scope].includes(token)) {
    return removeChipToken(normalizedInput, scope, token);
  }

  if (scope === "global") {
    const rawValue = token.startsWith("~")
      ? token.slice(1)
      : token.toLowerCase().startsWith("g:")
        ? token.slice(2)
        : token;
    const definition = GLOBAL_MODIFIER_MAP.get(
      normalizeModifierValue(rawValue),
    );

    if (
      definition?.section === "weather" ||
      definition?.section === "terrain"
    ) {
      normalizedInput = stripGlobalSectionTokens(
        normalizedInput,
        definition.section,
      );
    }
  }

  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = structure.attacker.rawTokens.map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens.map((entry) => entry.raw);

  if (scope === "attacker") {
    if (structure.lexed.hasDelimiter) {
      return [...attackerTokens, token, "x", ...defenderTokens]
        .join(" ")
        .trim();
    }

    return [...attackerTokens, token].join(" ").trim();
  }

  if (scope === "defender") {
    if (
      !structure.lexed.hasDelimiter ||
      !joinTokenValues(structure.defender.speciesTokens)
    ) {
      return normalizedInput;
    }

    return [...attackerTokens, "x", ...defenderTokens, token].join(" ").trim();
  }

  const baseTokens = structure.lexed.hasDelimiter
    ? [...attackerTokens, "x", ...defenderTokens]
    : attackerTokens;

  return [...baseTokens, token].join(" ").trim();
}

function stripModifierTokensByKind(
  scope: "attacker" | "defender",
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
  kind: "stat_mod" | "stat_stage" | "speed_mod" | "nature" | "status",
  statKey?: StageStatKey,
) {
  const modifierMap =
    scope === "attacker" ? ATTACKER_MODIFIER_MAP : DEFENDER_MODIFIER_MAP;

  return tokens.filter((entry) => {
    const raw = entry.raw;
    if (isLegacyScopedToken(raw)) {
      return false;
    }

    const value = normalizeModifierValue(raw);
    const definition = value ? modifierMap.get(value) : undefined;

    if (definition?.kind !== kind) {
      return true;
    }

    if (statKey && definition.statKey !== statKey) {
      return true;
    }

    return false;
  });
}

function stripItemTokens(
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
) {
  return tokens.filter((entry) => !entry.normalized.startsWith("@"));
}

function stripAbilityTokens(
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
) {
  return tokens.filter((entry) => !/^\[.+\]$/.test(entry.raw));
}

function setScopedToken(
  input: string,
  scope: "attacker" | "defender",
  token: string | null,
  stripTokens: (
    tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
  ) => ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker"
      ? stripTokens(structure.attacker.rawTokens)
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripTokens(structure.defender.rawTokens)
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);

  if (scope === "attacker") {
    const nextAttackerTokens = token ? [...attackerTokens, token] : attackerTokens;

    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (
    !structure.lexed.hasDelimiter ||
    !joinTokenValues(structure.defender.speciesTokens)
  ) {
    return normalizedInput;
  }

  const nextDefenderTokens = token ? [...defenderTokens, token] : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

export function setItemToken(
  input: string,
  scope: "attacker" | "defender",
  itemName: string | null | undefined,
) {
  const trimmedItem = itemName?.trim();
  const token = trimmedItem ? `@${slugifySymbolValue(trimmedItem)}` : null;

  return setScopedToken(input, scope, token, stripItemTokens);
}

export function setAbilityToken(
  input: string,
  scope: "attacker" | "defender",
  abilityName: string | null | undefined,
) {
  const trimmedAbility = abilityName?.trim();
  const token = trimmedAbility ? formatAbilityToken(scope, trimmedAbility) : null;

  return setScopedToken(input, scope, token, stripAbilityTokens);
}

function setScopedStageToken(
  input: string,
  scope: "attacker" | "defender",
  value: number,
  kind: "stat_mod" | "speed_mod",
) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker"
      ? stripModifierTokensByKind(
          "attacker",
          structure.attacker.rawTokens,
          kind,
        )
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripModifierTokensByKind(
          "defender",
          structure.defender.rawTokens,
          kind,
        )
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);

  const token =
    value === 0
      ? null
      : formatModifierToken(
          scope,
          kind === "speed_mod"
            ? value > 0
              ? `spe+${value}`
              : `spe${value}`
            : value > 0
              ? `+${value}`
              : `${value}`,
        );

  if (scope === "attacker") {
    const nextAttackerTokens = token
      ? [...attackerTokens, token]
      : attackerTokens;

    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (
    !structure.lexed.hasDelimiter ||
    !joinTokenValues(structure.defender.speciesTokens)
  ) {
    return normalizedInput;
  }

  const nextDefenderTokens = token
    ? [...defenderTokens, token]
    : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

export function setStatModifierToken(
  input: string,
  scope: "attacker" | "defender",
  value: number,
) {
  return setScopedStageToken(input, scope, value, "stat_mod");
}

export function setSpeedModifierToken(
  input: string,
  scope: "attacker" | "defender",
  value: number,
) {
  return setScopedStageToken(input, scope, value, "speed_mod");
}

export function setNamedStageModifierToken(
  input: string,
  scope: "attacker" | "defender",
  statKey: StageStatKey,
  value: number,
) {
  if (statKey === "spe") {
    return setSpeedModifierToken(input, scope, value);
  }

  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker"
      ? stripModifierTokensByKind(
          "attacker",
          structure.attacker.rawTokens,
          "stat_stage",
          statKey,
        )
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripModifierTokensByKind(
          "defender",
          structure.defender.rawTokens,
          "stat_stage",
          statKey,
        )
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);

  const token =
    value === 0
      ? null
      : formatModifierToken(
          scope,
          value > 0 ? `${statKey}+${value}` : `${statKey}${value}`,
        );

  if (scope === "attacker") {
    const nextAttackerTokens = token
      ? [...attackerTokens, token]
      : attackerTokens;

    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (
    !structure.lexed.hasDelimiter ||
    !joinTokenValues(structure.defender.speciesTokens)
  ) {
    return normalizedInput;
  }

  const nextDefenderTokens = token
    ? [...defenderTokens, token]
    : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

function resolveNatureModifierToken(
  scope: "attacker" | "defender",
  moveId: string | null | undefined,
  moveCategory: string | null | undefined,
  nature: string | null | undefined,
) {
  if (!nature) {
    return null;
  }

  if (scope === "attacker") {
    const attackingStatKey = resolveAttackingStatKey(moveId, moveCategory);
    const natureEffect = getNatureEffectDirectionForStat(
      nature,
      attackingStatKey,
    );

    if (natureEffect) {
      return natureEffect === "boost" ? "+nature" : "-nature";
    }

    return null;
  }

  if (!moveCategory) {
    return null;
  }

  const defendingStatKey = moveCategory === "Physical" ? "def" : "spd";
  const natureEffect = getNatureEffectDirectionForStat(
    nature,
    defendingStatKey,
  );

  if (natureEffect) {
    return natureEffect === "boost" ? "+nature" : "-nature";
  }

  return null;
}

export function setNatureModifierToken(
  input: string,
  scope: "attacker" | "defender",
  moveId: string | null | undefined,
  moveCategory: string | null | undefined,
  nature: string | null | undefined,
) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker"
      ? stripModifierTokensByKind("attacker", structure.attacker.rawTokens, "nature")
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripModifierTokensByKind("defender", structure.defender.rawTokens, "nature")
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);

  const token = resolveNatureModifierToken(scope, moveId, moveCategory, nature);

  if (scope === "attacker") {
    const nextAttackerTokens = token ? [...attackerTokens, token] : attackerTokens;

    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (
    !structure.lexed.hasDelimiter ||
    !joinTokenValues(structure.defender.speciesTokens)
  ) {
    return normalizedInput;
  }

  const nextDefenderTokens = token ? [...defenderTokens, token] : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

function resolveStatusModifierToken(status: PokemonStatus | null) {
  switch (status) {
    case "brn":
      return "burn";
    case "par":
      return "paralysis";
    case "psn":
      return "poison";
    case "slp":
      return "sleep";
    case "frz":
      return "freeze";
    default:
      return null;
  }
}

export function setStatusModifierToken(
  input: string,
  scope: "attacker" | "defender",
  status: PokemonStatus | null,
) {
  const tokenValue = resolveStatusModifierToken(status);
  const token = tokenValue ? formatModifierToken(scope, tokenValue) : null;

  return setScopedToken(
    input,
    scope,
    token,
    (tokens) => stripModifierTokensByKind(scope, tokens, "status"),
  );
}

function stripHpTokens(
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
) {
  return tokens.filter((entry) => !/^%\d{1,3}$/i.test(entry.raw));
}

export function setHpPercentageToken(
  input: string,
  scope: "attacker" | "defender",
  value: number | null,
) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker"
      ? stripHpTokens(structure.attacker.rawTokens)
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripHpTokens(structure.defender.rawTokens)
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);

  const token = value === null ? null : `%${Math.max(1, Math.min(100, value))}`;

  if (scope === "attacker") {
    const nextAttackerTokens = token
      ? [...attackerTokens, token]
      : attackerTokens;

    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (
    !structure.lexed.hasDelimiter ||
    !joinTokenValues(structure.defender.speciesTokens)
  ) {
    return normalizedInput;
  }

  const nextDefenderTokens = token
    ? [...defenderTokens, token]
    : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

function buildStatPointsToken(statPoints: StatSpread) {
  return `sp:${statPoints.hp}/${statPoints.atk}/${statPoints.def}/${statPoints.spa}/${statPoints.spd}/${statPoints.spe}`;
}

function rebuildInputWithSpecies(
  input: string,
  side: SummarySide,
  targetPokemon: PokemonEntry,
) {
  const structure = analyzeCommandStructure(input);
  const globalTokens = structure.globalTokens.map((token) => token.raw);
  const attackerTail = structure.attacker.rawTokens
    .slice(structure.attacker.speciesTokens.length)
    .map((token) => token.raw)
    .join(" ")
    .trim();
  const defenderTail = structure.defender.rawTokens
    .slice(structure.defender.speciesTokens.length)
    .map((token) => token.raw)
    .join(" ")
    .trim();
  const attackerSpecies =
    side === "attacker"
      ? getCanonicalPromptPokemonName(targetPokemon)
      : (
          structure.attacker.speciesText ||
          joinTokenValues(structure.attacker.rawTokens)
        ).trim();
  const defenderSpecies =
    side === "defender"
      ? getCanonicalPromptPokemonName(targetPokemon)
      : (
          structure.defender.speciesText ||
          joinTokenValues(structure.defender.rawTokens)
        ).trim();
  const attackerText = [attackerSpecies, attackerTail]
    .filter(Boolean)
    .join(" ")
    .trim();
  const defenderText = [defenderSpecies, defenderTail]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!structure.lexed.hasDelimiter) {
    return attackerText;
  }

  return [attackerText, "x", defenderText, ...globalTokens]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function rebuildInputWithStatPoints(
  input: string,
  side: SummarySide,
  nextStatPoints: StatSpread,
  persistExplicitToken: boolean,
) {
  const structure = analyzeCommandStructure(input);
  const nextToken = buildStatPointsToken(nextStatPoints);
  const shouldIncludeToken =
    persistExplicitToken ||
    Object.values(nextStatPoints).some((value) => value > 0);

  const rewriteSegmentTokens = (
    tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
  ) => {
    const nextTokens = tokens
      .filter((token) => !token.normalized.startsWith("sp:"))
      .map((token) => token.raw);

    if (!shouldIncludeToken) {
      return nextTokens;
    }

    const firstGlobalTokenIndex = nextTokens.findIndex((token) =>
      token.toLowerCase().startsWith("~"),
    );

    if (firstGlobalTokenIndex === -1) {
      nextTokens.push(nextToken);
    } else {
      nextTokens.splice(firstGlobalTokenIndex, 0, nextToken);
    }

    return nextTokens;
  };

  const attackerTokens =
    side === "attacker"
      ? rewriteSegmentTokens(structure.attacker.rawTokens)
      : structure.attacker.rawTokens.map((token) => token.raw);
  const defenderTokens =
    side === "defender"
      ? rewriteSegmentTokens(structure.defender.rawTokens)
      : structure.defender.rawTokens.map((token) => token.raw);

  if (!structure.lexed.hasDelimiter) {
    return attackerTokens.join(" ").trim();
  }

  return [attackerTokens.join(" ").trim(), "x", defenderTokens.join(" ").trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function stripMoveTokens(
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
) {
  return tokens.filter((entry) => {
    const normalized = entry.normalized;
    return (
      !normalized.startsWith("m:") &&
      !normalized.startsWith("!") &&
      !normalized.startsWith("~")
    );
  });
}

function getReferencedSetForSegment(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
  importedSets: Record<string, ImportedSet>,
) {
  return resolveSetReferenceToken(segment.leadingFreeTokens[0]?.raw, importedSets);
}

export function swapPromptSides(
  input: string,
  importedSets: Record<string, ImportedSet> = {},
) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);

  if (
    !structure.lexed.hasDelimiter ||
    !joinTokenValues(structure.defender.speciesTokens)
  ) {
    return normalizedInput;
  }

  const attackerReferenceSet = getReferencedSetForSegment(
    structure.attacker,
    importedSets,
  );
  const defenderReferenceSet = getReferencedSetForSegment(
    structure.defender,
    importedSets,
  );
  const fallbackMove = defenderReferenceSet?.moves[0]?.trim();
  const fallbackMoveToken = fallbackMove
    ? `!${slugifySymbolValue(fallbackMove)}`
    : null;
  const separator = structure.separatorText ?? "x";
  const attackerTokens = stripMoveTokens(structure.defender.rawTokens).map(
    (entry) => entry.raw,
  );
  const defenderTokens = stripMoveTokens(structure.attacker.rawTokens).map(
    (entry) => entry.raw,
  );
  const attackerMoveToken = structure.defender.moveToken?.raw ?? fallbackMoveToken;
  const globalTokens = structure.globalTokens.map((token) => token.raw);
  const nextAttackerTokens = attackerMoveToken
    ? [...attackerTokens, attackerMoveToken]
    : attackerTokens;

  return [nextAttackerTokens.join(" ").trim(), separator, defenderTokens.join(" ").trim(), ...globalTokens]
    .filter(Boolean)
    .join(" ")
    .trim();
}
