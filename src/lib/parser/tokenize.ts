import type { StatSpread } from "@/lib/types";

export interface LexToken {
  raw: string;
  normalized: string;
  start: number;
  end: number;
}

function isHpToken(raw: string) {
  return /^%\d{1,3}$/i.test(raw.trim());
}

export function parseHpToken(raw: string) {
  if (!isHpToken(raw)) {
    return null;
  }

  const value = Number(raw.trim().slice(1));
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(1, Math.min(100, value));
}

function parseCompactSpreadToken(
  raw: string,
  prefix: "sp",
  maxValue: number,
  maxTotal?: number,
): StatSpread | null {
  const match = raw
    .trim()
    .match(new RegExp(`^${prefix}:(\\d{1,2})\\/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{1,2})$`, "i"));

  if (!match) {
    return null;
  }

  const [, hp, atk, def, spa, spd, spe] = match;
  const spread = {
    hp: Number(hp),
    atk: Number(atk),
    def: Number(def),
    spa: Number(spa),
    spd: Number(spd),
    spe: Number(spe),
  };

  const values = Object.values(spread);
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > maxValue)) {
    return null;
  }

  if (maxTotal !== undefined) {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total > maxTotal) {
      return null;
    }
  }

  return spread;
}

export function parseStatPointsToken(raw: string) {
  return parseCompactSpreadToken(raw, "sp", 32, 66);
}

export interface TokenizedCommand {
  rawInput: string;
  normalizedInput: string;
  tokens: LexToken[];
  delimiterIndex: number;
  hasDelimiter: boolean;
  trailingWhitespace: boolean;
  attackerTokens: LexToken[];
  defenderTokens: LexToken[];
}

export function compactWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function joinTokenValues(tokens: LexToken[]) {
  return tokens.map((token) => token.normalized).join(" ");
}

export function buildCommandText(tokens: string[]) {
  return tokens.filter(Boolean).join(" ").trim();
}

export function lexCommandInput(input: string): TokenizedCommand {
  const tokens: LexToken[] = [];
  const trailingWhitespace = /\s$/.test(input);
  let index = 0;

  while (index < input.length) {
    while (index < input.length && /\s/.test(input[index])) {
      index += 1;
    }

    if (index >= input.length) {
      break;
    }

    const start = index;
    let bracketDepth = 0;

    while (index < input.length) {
      const character = input[index];

      if (character === "[") {
        bracketDepth += 1;
      } else if (character === "]" && bracketDepth > 0) {
        bracketDepth -= 1;
      } else if (/\s/.test(character) && bracketDepth === 0) {
        break;
      }

      index += 1;
    }

    const raw = input.slice(start, index);
    tokens.push({
      raw,
      normalized: raw.toLowerCase(),
      start,
      end: index,
    });
  }

  const delimiterIndex = tokens.findIndex((token, index, collection) => {
    if (token.normalized === "vs") {
      return true;
    }

    if (token.normalized !== "x") {
      return false;
    }

    return collection[index - 1]?.normalized !== "mega";
  });
  const hasDelimiter = delimiterIndex >= 0;

  return {
    rawInput: input,
    normalizedInput: compactWhitespace(input.toLowerCase()),
    tokens,
    delimiterIndex,
    hasDelimiter,
    trailingWhitespace,
    attackerTokens: hasDelimiter ? tokens.slice(0, delimiterIndex) : tokens,
    defenderTokens: hasDelimiter ? tokens.slice(delimiterIndex + 1) : [],
  };
}
