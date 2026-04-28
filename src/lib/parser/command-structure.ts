import type { LexToken, TokenizedCommand } from "@/lib/parser/tokenize";
import {
  buildCommandText,
  joinTokenValues,
  lexCommandInput,
  parseHpToken,
  parseStatPointsToken,
} from "@/lib/parser/tokenize";
import {
  ATTACKER_MODIFIER_MAP,
  DEFENDER_MODIFIER_MAP,
  GLOBAL_MODIFIER_MAP,
  normalizeModifierValue,
  parseAbilitySymbol,
  slugifySymbolValue,
} from "@/lib/parser/grammar";
import {
  resolveExactPokemonEntity,
  resolvePokemonEntity,
} from "@/lib/parser/fuse-indexes";
import type { StatSpread } from "@/lib/types";

interface SymbolToken {
  raw: string;
  normalized: string;
  kind:
    | "move"
    | "item"
    | "ability"
    | "modifier"
    | "hp"
    | "critical"
    | "stat_points"
    | "unknown";
  scope?: "attacker" | "defender" | "global";
  value: string;
  hits?: number;
  hitCountInvalid?: boolean;
  lastRespectsStacks?: number;
  spread?: StatSpread;
  source: LexToken;
}

interface SegmentStructure {
  side: "attacker" | "defender";
  rawTokens: LexToken[];
  leadingFreeTokens: LexToken[];
  speciesTokens: LexToken[];
  speciesText: string;
  speciesExact: ReturnType<typeof resolveExactPokemonEntity>;
  speciesMatch: ReturnType<typeof resolvePokemonEntity>;
  leadingRemainderTokens: LexToken[];
  postExplicitFreeTokens: LexToken[];
  symbolTokens: SymbolToken[];
  modifierTokens: SymbolToken[];
  globalTokens: SymbolToken[];
  hpToken?: SymbolToken;
  criticalToken?: SymbolToken;
  moveToken?: SymbolToken;
  itemToken?: SymbolToken;
  abilityToken?: SymbolToken;
  statPointToken?: SymbolToken;
  unknownExplicitTokens: LexToken[];
  misplacedTokens: SymbolToken[];
}

interface CommandStructure {
  lexed: TokenizedCommand;
  separatorText: "x" | "vs" | null;
  attacker: SegmentStructure;
  defender: SegmentStructure;
  globalTokens: SymbolToken[];
}

function isLegacyScopedSymbol(token: string) {
  return /^(?:[adg]:|>|<)/i.test(token);
}

function isExplicitToken(token: LexToken) {
  return /^(m:|!|@|~|\*|%|\[|sp:)/i.test(token.normalized);
}

function parseMoveSymbol(raw: string) {
  const body = raw.startsWith("!") ? raw.slice(1) : raw.slice(2);
  const match = body.match(/^(.*?)(?:\((\d{1,2})\)|\[(\d{1,2})\])?$/);

  if (!match) {
    return null;
  }

  const [, moveBody, parenthesizedParameter, bracketedParameter] = match;
  const value = slugifySymbolValue(moveBody);

  if (!value) {
    return null;
  }

  const parameterText = parenthesizedParameter ?? bracketedParameter;
  const parsedParameter = parameterText ? Number(parameterText) : undefined;
  const isLastRespects = value === "last-respects";
  const lastRespectsStacks =
    isLastRespects && parsedParameter !== undefined ? parsedParameter : undefined;
  const lastRespectsStacksInvalid =
    lastRespectsStacks !== undefined &&
    (!Number.isInteger(lastRespectsStacks) ||
      lastRespectsStacks < 0 ||
      lastRespectsStacks > 3);
  const parsedHitCount =
    !isLastRespects && parsedParameter !== undefined
      ? parsedParameter
      : undefined;
  const hitCountInvalid =
    lastRespectsStacksInvalid ||
    (parsedHitCount !== undefined &&
      (!Number.isInteger(parsedHitCount) ||
        parsedHitCount < 1 ||
        parsedHitCount > 10));

  return {
    value,
    hits: hitCountInvalid ? undefined : parsedHitCount,
    hitCountInvalid,
    lastRespectsStacks: lastRespectsStacksInvalid
      ? undefined
      : lastRespectsStacks,
  };
}

function parseExplicitSymbolToken(
  token: LexToken,
  side: "attacker" | "defender",
): SymbolToken | null {
  const ability = parseAbilitySymbol(token.raw, side);
  if (ability) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "ability",
      scope: ability.scope,
      value: ability.ability,
      source: token,
    };
  }

  if (token.normalized.startsWith("m:") || token.normalized.startsWith("!")) {
    const parsedMove = parseMoveSymbol(token.raw);

    if (!parsedMove) {
      return null;
    }

    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "move",
      value: parsedMove.value,
      hits: parsedMove.hits,
      hitCountInvalid: parsedMove.hitCountInvalid,
      lastRespectsStacks: parsedMove.lastRespectsStacks,
      source: token,
    };
  }

  if (token.normalized.startsWith("@")) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "item",
      value: slugifySymbolValue(token.raw.slice(1)),
      source: token,
    };
  }

  if (token.raw === "*") {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "critical",
      value: "*",
      source: token,
    };
  }

  const hpPercent = parseHpToken(token.raw);
  if (hpPercent !== null) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "hp",
      value: String(hpPercent),
      source: token,
    };
  }

  const statPoints = parseStatPointsToken(token.raw);
  if (statPoints) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "stat_points",
      scope: side,
      value: token.raw,
      spread: statPoints,
      source: token,
    };
  }

  if (token.normalized.startsWith("~")) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "modifier",
      scope: "global",
      value: normalizeModifierValue(
        token.raw.slice(1),
      ),
      source: token,
    };
  }

  return null;
}

function parseBareSegmentToken(
  token: LexToken,
  side: "attacker" | "defender",
): SymbolToken | null {
  if (isLegacyScopedSymbol(token.raw)) {
    return null;
  }

  const normalizedValue = normalizeModifierValue(token.raw);

  if (
    side === "attacker" &&
    ATTACKER_MODIFIER_MAP.has(normalizedValue)
  ) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "modifier",
      scope: "attacker",
      value: normalizedValue,
      source: token,
    };
  }

  if (
    side === "defender" &&
    DEFENDER_MODIFIER_MAP.has(normalizedValue)
  ) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "modifier",
      scope: "defender",
      value: normalizedValue,
      source: token,
    };
  }

  return null;
}

function findSpeciesSplit(tokens: LexToken[]) {
  for (let length = tokens.length; length >= 1; length -= 1) {
    const text = joinTokenValues(tokens.slice(0, length));
    const exact = resolveExactPokemonEntity(text);

    if (exact) {
      return {
        exact,
        speciesTokens: tokens.slice(0, length),
        remainderTokens: tokens.slice(length),
      };
    }
  }

  return {
    exact: null,
    speciesTokens: tokens,
    remainderTokens: [] as LexToken[],
  };
}

function findLeadingReferenceSplit(tokens: LexToken[]) {
  if (!tokens[0]?.raw.startsWith("#")) {
    return null;
  }

  return {
    speciesTokens: tokens.slice(0, 1),
    remainderTokens: tokens.slice(1),
  };
}

function analyzeSegment(tokens: LexToken[], side: "attacker" | "defender"): SegmentStructure {
  const firstExplicitIndex = tokens.findIndex((token) => isExplicitToken(token));
  const leadingFreeTokens =
    firstExplicitIndex === -1 ? tokens : tokens.slice(0, firstExplicitIndex);
  const explicitSlice = firstExplicitIndex === -1 ? [] : tokens.slice(firstExplicitIndex);

  const leadingReferenceSplit = findLeadingReferenceSplit(leadingFreeTokens);
  const { exact, speciesTokens, remainderTokens } = leadingReferenceSplit
    ? {
        exact: null,
        speciesTokens: leadingReferenceSplit.speciesTokens,
        remainderTokens: leadingReferenceSplit.remainderTokens,
      }
    : findSpeciesSplit(leadingFreeTokens);
  const explicitSymbolTokens = explicitSlice
    .map((token) => parseExplicitSymbolToken(token, side))
    .filter((token): token is SymbolToken => Boolean(token));
  const unknownExplicitTokens = explicitSlice.filter(
    (token) => isExplicitToken(token) && !parseExplicitSymbolToken(token, side),
  );
  const moveToken = side === "attacker"
    ? explicitSymbolTokens.find((token) => token.kind === "move")
    : undefined;
  // Keep unresolved attacker tail text available for move suggestions, but
  // peel out any known bare modifiers even before a move is declared.
  const bareTokenCandidates = [
    ...remainderTokens,
    ...explicitSlice.filter((token) => !isExplicitToken(token)),
  ];
  const parsedBareTokens: SymbolToken[] = [];
  const parsedBareTokenPositions = new Set<string>();

  for (const token of bareTokenCandidates) {
    const parsedToken = parseBareSegmentToken(token, side);

    if (!parsedToken) {
      continue;
    }

    parsedBareTokens.push(parsedToken);
    parsedBareTokenPositions.add(`${token.start}:${token.end}`);
  }

  const unresolvedRemainderTokens = remainderTokens.filter(
    (token) => !parsedBareTokenPositions.has(`${token.start}:${token.end}`),
  );
  const postExplicitFreeTokens = explicitSlice.filter(
    (token) =>
      !isExplicitToken(token) &&
      !parsedBareTokenPositions.has(`${token.start}:${token.end}`),
  );
  const symbolTokens = [...explicitSymbolTokens, ...parsedBareTokens];
  const itemToken = symbolTokens.filter((token) => token.kind === "item").at(-1);
  const abilityToken = symbolTokens.filter(
    (token) => token.kind === "ability" && token.scope === side,
  ).at(-1);
  const statPointToken = symbolTokens.filter(
    (token) => token.kind === "stat_points" && token.scope === side,
  ).at(-1);
  const hpToken = symbolTokens.filter((token) => token.kind === "hp").at(-1);
  const criticalToken = symbolTokens.filter((token) => token.kind === "critical").at(-1);
  const modifierTokens = symbolTokens.filter(
    (token) => token.kind === "modifier" && token.scope === side,
  );
  const globalTokens = symbolTokens.filter(
    (token) => token.kind === "modifier" && token.scope === "global",
  );
  const misplacedTokens = symbolTokens.filter((token) => {
    if (token.kind === "move") {
      return side !== "attacker";
    }

    if (token.kind === "item") {
      return false;
    }

    if (token.kind === "ability") {
      return token.scope !== side;
    }

    if (token.kind !== "modifier") {
      return false;
    }

    if (token.scope === "global") {
      return false;
    }

    const map =
      token.scope === "attacker" ? ATTACKER_MODIFIER_MAP : DEFENDER_MODIFIER_MAP;
    const isKnown = map.has(token.value);

    return token.scope !== side || !isKnown;
  });

  const hasLeadingReference = Boolean(leadingReferenceSplit);
  const speciesText = buildCommandText(
    (exact || hasLeadingReference ? speciesTokens : leadingFreeTokens).map(
      (token) => token.normalized,
    ),
  );

  return {
    side,
    rawTokens: tokens,
    leadingFreeTokens,
    speciesTokens: exact || hasLeadingReference ? speciesTokens : leadingFreeTokens,
    speciesText,
    speciesExact: exact,
    speciesMatch:
      speciesText && !hasLeadingReference ? resolvePokemonEntity(speciesText) : null,
    leadingRemainderTokens:
      exact || hasLeadingReference ? unresolvedRemainderTokens : [],
    postExplicitFreeTokens,
    symbolTokens,
    modifierTokens,
    globalTokens,
    hpToken,
    criticalToken,
    moveToken,
    itemToken,
    abilityToken,
    statPointToken,
    unknownExplicitTokens,
    misplacedTokens,
  };
}

export function analyzeCommandStructure(input: string): CommandStructure {
  const lexed = lexCommandInput(input);
  const attacker = analyzeSegment(lexed.attackerTokens, "attacker");
  const defender = analyzeSegment(lexed.defenderTokens, "defender");

  return {
    lexed,
    separatorText: lexed.hasDelimiter
      ? (lexed.tokens[lexed.delimiterIndex]?.normalized as "x" | "vs")
      : null,
    attacker,
    defender,
    globalTokens: [...attacker.globalTokens, ...defender.globalTokens].filter(
      (token, index, collection) =>
        collection.findIndex(
          (entry) => entry.scope === token.scope && entry.value === token.value,
        ) === index,
    ),
  };
}

export function isKnownModifierToken(scope: "attacker" | "defender" | "global", value: string) {
  if (scope === "attacker") {
    return ATTACKER_MODIFIER_MAP.has(value);
  }

  if (scope === "defender") {
    return DEFENDER_MODIFIER_MAP.has(value);
  }

  return GLOBAL_MODIFIER_MAP.has(value);
}
