import { itemDisplayById } from "@/lib/data/items";
import { normalizeAlias, normalizeId } from "@/lib/data/normalization";
import { legalPokemonData, pokemonById } from "@/lib/data/pokemon";
import { vgcMetaByPokemonId } from "@/lib/data/vgc-meta";
import { resolveExactPokemonEntity } from "@/lib/parser/fuse-indexes";
import { lexCommandInput } from "@/lib/parser/tokenize";
import type {
  PokemonEntry,
  SpeedGlobalState,
  SpeedNatureBucket,
  SpeedSideState,
} from "@/lib/types";

interface ParsedSpeedCommand {
  subject: SpeedSideState | null;
  comparator: SpeedSideState | null;
  globals: SpeedGlobalState;
  issues: string[];
}

export const DEFAULT_SPEED_GLOBALS: SpeedGlobalState = {
  sun: false,
  rain: false,
  sand: false,
  snow: false,
  electricTerrain: false,
  trickRoom: false,
};

const itemNames = Array.from(itemDisplayById.values());
const legalPokemonByAlias = new Map<string, PokemonEntry[]>();

for (const pokemon of legalPokemonData) {
  for (const alias of pokemon.aliases) {
    const key = normalizeAlias(alias);
    const bucket = legalPokemonByAlias.get(key) ?? [];
    bucket.push(pokemon);
    legalPokemonByAlias.set(key, bucket);
  }
}

function resolvePokemonFromTokens(tokens: string[]) {
  for (let length = tokens.length; length >= 1; length -= 1) {
    const candidate = tokens.slice(0, length).join(" ");
    const resolved = resolveExactPokemonEntity(candidate);

    if (resolved) {
      return {
        pokemon: resolved.entry,
        consumed: length,
      };
    }

    const normalized = normalizeAlias(candidate);
    const fallback = legalPokemonByAlias.get(normalized)?.[0];

    if (fallback) {
      return {
        pokemon: fallback,
        consumed: length,
      };
    }
  }

  return null;
}

function resolveItemFromToken(token: string) {
  const normalized = normalizeId(token.replace(/^@/, ""));
  return itemNames.find((name) => normalizeId(name) === normalized);
}

function resolveAbilityFromToken(pokemon: PokemonEntry, token: string) {
  const body = token.startsWith("[") && token.endsWith("]")
    ? token.slice(1, -1)
    : token;
  const normalized = normalizeId(body);
  return pokemon.abilities.find((ability) => normalizeId(ability) === normalized);
}

function formatCommandSlug(value: string) {
  return normalizeAlias(value).replace(/\s+/g, "-");
}

function parseNatureBucket(token: string): SpeedNatureBucket | null {
  const normalized = normalizeId(token);
  const compact = token.trim().toLowerCase();

  if (
    compact === "+nature" ||
    compact === "+speed" ||
    compact === "speed+" ||
    [
      "plusnature",
      "speedplus",
      "positive",
      "jolly",
      "timid",
      "hasty",
      "naive",
    ].includes(normalized)
  ) {
    return "plus";
  }

  if (
    compact === "-nature" ||
    compact === "-speed" ||
    compact === "speed-" ||
    [
      "minusnature",
      "speedminus",
      "negative",
      "brave",
      "relaxed",
      "quiet",
      "sassy",
    ].includes(normalized)
  ) {
    return "minus";
  }

  if (["nature", "neutralnature", "neutral"].includes(normalized)) {
    return "neutral";
  }

  return null;
}

function parseSpeedStage(token: string) {
  const match = token.match(/^(?:spe)?([+-][1-6])$/i);
  return match ? Number(match[1]) : null;
}

function parseSpeSp(token: string) {
  const match = token.match(/^spe-sp:(\d{1,2})$/i);
  if (!match) return null;

  return Math.max(0, Math.min(32, Number(match[1])));
}

export function createSpeedSideFromPokemon(pokemon: PokemonEntry): SpeedSideState {
  const profile = vgcMetaByPokemonId.get(pokemon.id);

  return {
    source: "species",
    speciesId: pokemon.id,
    item: profile?.defaultItem,
    ability: profile?.defaultAbility ?? pokemon.abilities[0],
    abilityActiveStates: [],
    nature: "neutral",
    speSp: 32,
    speedStage: 0,
    tailwind: false,
    paralysis: false,
    overrides: [],
  };
}

function parseSide(tokens: string[], label: string, issues: string[]) {
  const resolvedPokemon = resolvePokemonFromTokens(tokens);

  if (!resolvedPokemon) {
    if (tokens.length) {
      issues.push(`Could not resolve ${label} Pokemon.`);
    }

    return null;
  }

  const side = createSpeedSideFromPokemon(resolvedPokemon.pokemon);
  const remainder = tokens.slice(resolvedPokemon.consumed);

  for (let index = 0; index < remainder.length; index += 1) {
    const rawToken = remainder[index];
    const itemCandidate =
      resolveItemFromToken(remainder.slice(index, index + 3).join(" ")) ??
      resolveItemFromToken(remainder.slice(index, index + 2).join(" ")) ??
      resolveItemFromToken(rawToken);
    const itemTokenLength =
      itemCandidate === resolveItemFromToken(remainder.slice(index, index + 3).join(" "))
        ? 3
        : itemCandidate === resolveItemFromToken(remainder.slice(index, index + 2).join(" "))
          ? 2
          : 1;
    const token = rawToken.trim();
    const normalized = normalizeId(token);
    const nature = parseNatureBucket(token);
    const speedStage = parseSpeedStage(token);
    const speSp = parseSpeSp(token);
    const ability = resolveAbilityFromToken(resolvedPokemon.pokemon, token);

    if (!token) continue;

    if (speSp !== null) {
      side.speSp = speSp;
      side.overrides.push(`spe-sp:${speSp}`);
    } else if (speedStage !== null) {
      side.speedStage = speedStage;
      side.overrides.push(`spe${speedStage > 0 ? "+" : ""}${speedStage}`);
    } else if (nature) {
      side.nature = nature;
      side.overrides.push(`${nature} nature`);
    } else if (normalized === "tailwind") {
      side.tailwind = true;
      side.overrides.push("tailwind");
    } else if (normalized === "paralysis" || normalized === "par") {
      side.paralysis = true;
      side.overrides.push("paralysis");
    } else if (normalized === "unburdenactive") {
      side.abilityActiveStates = ["unburden-active"];
      side.overrides.push("unburden active");
    } else if (itemCandidate) {
      side.item = itemCandidate;
      side.overrides.push(itemCandidate);
      index += itemTokenLength - 1;
    } else if (ability) {
      side.ability = ability;
      side.overrides.push(ability);
    } else {
      issues.push(`Unknown ${label} token: ${rawToken}`);
    }
  }

  return side;
}

function parseGlobalToken(token: string, globals: SpeedGlobalState, issues: string[]) {
  const normalized = normalizeId(token.replace(/^~/, ""));

  if (normalized === "sun") globals.sun = true;
  else if (normalized === "rain") globals.rain = true;
  else if (normalized === "sand") globals.sand = true;
  else if (normalized === "snow") globals.snow = true;
  else if (normalized === "electricterrain") globals.electricTerrain = true;
  else if (normalized === "trickroom") globals.trickRoom = true;
  else issues.push(`Unknown global token: ${token}`);
}

export function parseSpeedCommand(input: string): ParsedSpeedCommand {
  const lexed = lexCommandInput(input);
  const issues: string[] = [];
  const globals = { ...DEFAULT_SPEED_GLOBALS };
  const subjectTokens: string[] = [];
  const comparatorTokens: string[] = [];

  for (const token of lexed.attackerTokens) {
    if (token.raw.startsWith("~")) {
      parseGlobalToken(token.raw, globals, issues);
    } else {
      subjectTokens.push(token.raw);
    }
  }

  for (const token of lexed.defenderTokens) {
    if (token.raw.startsWith("~")) {
      parseGlobalToken(token.raw, globals, issues);
    } else {
      comparatorTokens.push(token.raw);
    }
  }

  if (!lexed.hasDelimiter && comparatorTokens.length) {
    issues.push("Use x before the comparator Pokemon.");
  }

  return {
    subject: parseSide(subjectTokens, "subject", issues),
    comparator: lexed.hasDelimiter
      ? parseSide(comparatorTokens, "comparator", issues)
      : null,
    globals,
    issues,
  };
}

function formatSpeedSideCommand(side: SpeedSideState | null) {
  if (!side) return "";

  const pokemon = pokemonById.get(side.speciesId);
  const tokens = [
    pokemon?.name ?? side.speciesId,
    side.item && side.overrides.includes(side.item)
      ? `@${formatCommandSlug(side.item)}`
      : "",
    side.ability && side.overrides.includes(side.ability) ? `[${side.ability}]` : "",
    side.nature === "plus" ? "+speed" : "",
    side.nature === "minus" ? "-speed" : "",
    side.speSp !== 32 ? `spe-sp:${side.speSp}` : "",
    side.speedStage ? `spe${side.speedStage > 0 ? "+" : ""}${side.speedStage}` : "",
    side.tailwind ? "tailwind" : "",
    side.paralysis ? "paralysis" : "",
    side.abilityActiveStates.includes("unburden-active") ? "unburden-active" : "",
  ];

  return tokens.filter(Boolean).join(" ");
}

export function formatSpeedCommand(
  subject: SpeedSideState | null,
  comparator: SpeedSideState | null,
  globals: SpeedGlobalState,
) {
  const globalTokens = [
    globals.sun ? "~sun" : "",
    globals.rain ? "~rain" : "",
    globals.sand ? "~sand" : "",
    globals.snow ? "~snow" : "",
    globals.electricTerrain ? "~electric-terrain" : "",
    globals.trickRoom ? "~trick-room" : "",
  ].filter(Boolean);
  const sideText = comparator
    ? `${formatSpeedSideCommand(subject)} x ${formatSpeedSideCommand(comparator)}`
    : formatSpeedSideCommand(subject);

  return [sideText, ...globalTokens].filter(Boolean).join(" ").trim();
}
