import type { LexToken, TokenizedCommand } from "@/lib/parser/tokenize";
import {
  buildCommandText,
  joinTokenValues,
  lexCommandInput,
  parseHpToken,
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

interface SymbolToken {
  raw: string;
  normalized: string;
  kind: "move" | "item" | "ability" | "modifier" | "hp" | "critical" | "unknown";
  scope?: "attacker" | "defender" | "global";
  value: string;
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
  misplacedTokens: SymbolToken[];
}

interface CommandStructure {
  lexed: TokenizedCommand;
  separatorText: "x" | "vs" | null;
  attacker: SegmentStructure;
  defender: SegmentStructure;
  globalTokens: SymbolToken[];
}

function isExplicitToken(token: LexToken) {
  return /^(m:|a:|d:|g:|!|@|>|<|~|\*|%)/i.test(token.normalized);
}

function parseSymbolToken(token: LexToken): SymbolToken | null {
  const ability = parseAbilitySymbol(token.raw);
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
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "move",
      value: slugifySymbolValue(
        token.normalized.startsWith("m:") ? token.raw.slice(2) : token.raw.slice(1),
      ),
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

  if (token.normalized.startsWith("a:") || token.normalized.startsWith(">")) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "modifier",
      scope: "attacker",
      value: normalizeModifierValue(
        token.normalized.startsWith("a:") ? token.raw.slice(2) : token.raw.slice(1),
      ),
      source: token,
    };
  }

  if (token.normalized.startsWith("d:") || token.normalized.startsWith("<")) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "modifier",
      scope: "defender",
      value: normalizeModifierValue(
        token.normalized.startsWith("d:") ? token.raw.slice(2) : token.raw.slice(1),
      ),
      source: token,
    };
  }

  if (token.normalized.startsWith("g:") || token.normalized.startsWith("~")) {
    return {
      raw: token.raw,
      normalized: token.normalized,
      kind: "modifier",
      scope: "global",
      value: normalizeModifierValue(
        token.normalized.startsWith("g:") ? token.raw.slice(2) : token.raw.slice(1),
      ),
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

function analyzeSegment(tokens: LexToken[], side: "attacker" | "defender"): SegmentStructure {
  const firstExplicitIndex = tokens.findIndex((token) => isExplicitToken(token));
  const leadingFreeTokens =
    firstExplicitIndex === -1 ? tokens : tokens.slice(0, firstExplicitIndex);
  const explicitSlice = firstExplicitIndex === -1 ? [] : tokens.slice(firstExplicitIndex);

  const { exact, speciesTokens, remainderTokens } = findSpeciesSplit(leadingFreeTokens);
  const symbolTokens = explicitSlice
    .map((token) => parseSymbolToken(token))
    .filter((token): token is SymbolToken => Boolean(token));
  const postExplicitFreeTokens = explicitSlice.filter((token) => !isExplicitToken(token));
  const moveToken = side === "attacker"
    ? symbolTokens.find((token) => token.kind === "move")
    : undefined;
  const itemToken = side === "attacker"
    ? symbolTokens.find((token) => token.kind === "item")
    : undefined;
  const abilityToken = symbolTokens.find(
    (token) => token.kind === "ability" && token.scope === side,
  );
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
      return side !== "attacker";
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

  const speciesText = buildCommandText(
    (exact ? speciesTokens : leadingFreeTokens).map((token) => token.normalized),
  );

  return {
    side,
    rawTokens: tokens,
    leadingFreeTokens,
    speciesTokens: exact ? speciesTokens : leadingFreeTokens,
    speciesText,
    speciesExact: exact,
    speciesMatch: speciesText ? resolvePokemonEntity(speciesText) : null,
    leadingRemainderTokens: exact ? remainderTokens : [],
    postExplicitFreeTokens,
    symbolTokens,
    modifierTokens,
    globalTokens,
    hpToken,
    criticalToken,
    moveToken,
    itemToken,
    abilityToken,
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
