import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import {
  ATTACKER_MODIFIER_MAP,
  DEFENDER_MODIFIER_MAP,
  GLOBAL_MODIFIER_MAP,
  formatAbilityToken,
  formatModifierToken,
  normalizeModifierValue,
  parseAbilitySymbol,
} from "@/lib/parser/grammar";
import { compactWhitespace, joinTokenValues } from "@/lib/parser/tokenize";
import type { ActiveChipTokens } from "@/lib/types";

export type ChipScope = keyof ActiveChipTokens;
type AutoFieldCategory = "weather" | "terrain";

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

export function insertChipToken(input: string, scope: ChipScope, token: string) {
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
  kind: "stat_mod" | "speed_mod",
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

    return definition?.kind !== kind;
  });
}

export function setScopedStageToken(
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
