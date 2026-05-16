import { normalizeAlias, normalizeId } from "@/lib/data/normalization";
import { pokemonById } from "@/lib/data/pokemon";
import { vgcMetaProfiles } from "@/lib/data/vgc-meta";
import { searchPokemonEntities } from "@/lib/parser/fuse-indexes";
import { lexCommandInput } from "@/lib/parser/tokenize";
import { parseSpeedCommand } from "@/lib/speed/speed-command";
import type { PokemonEntry, SpeedSideState } from "@/lib/types";

export interface SpeedAutocompleteOption {
  type: "pokemon" | "modifier" | "separator" | "global" | "ability";
  value: string;
  label: string;
  detail?: string;
  replaceFrom: number;
  replaceTo: number;
  suffix?: string;
}

const SPEED_RELEVANT_ABILITIES = new Set([
  "chlorophyll",
  "quickfeet",
  "sandrush",
  "slushrush",
  "surgesurfer",
  "swiftswim",
  "unburden",
]);

const SIDE_MODIFIERS = [
  { value: "+speed", label: "+Speed Nature" },
  { value: "-speed", label: "-Speed Nature" },
  { value: "neutral", label: "Neutral Nature" },
  { value: "spe-sp:20", label: "Spe SP" },
  { value: "spe+1", label: "Speed +1" },
  { value: "spe-1", label: "Speed -1" },
  { value: "tailwind", label: "Tailwind" },
  { value: "choice scarf", label: "Choice Scarf" },
  { value: "paralysis", label: "Paralysis" },
];

const GLOBAL_MODIFIERS = [
  { value: "~sun", label: "Sun" },
  { value: "~rain", label: "Rain" },
  { value: "~sand", label: "Sand" },
  { value: "~snow", label: "Snow" },
  { value: "~electric-terrain", label: "Electric Terrain" },
  { value: "~trick-room", label: "Trick Room" },
];

function optionMatches(value: string, query: string) {
  if (!query) return true;

  return normalizeAlias(value).startsWith(normalizeAlias(query));
}

function appendRange(input: string) {
  return {
    replaceFrom: input.length,
    replaceTo: input.length,
  };
}

function appendSuffix(input: string) {
  return input.trim() ? " " : "";
}

export function getDefaultSpeedPokemonSuggestions(limit = 6) {
  return vgcMetaProfiles
    .slice()
    .sort((left, right) => left.usageRank - right.usageRank)
    .map((profile) => pokemonById.get(profile.pokemonId))
    .filter((pokemon): pokemon is PokemonEntry => Boolean(pokemon))
    .filter(
      (pokemon, index, collection) =>
        collection.findIndex((entry) => entry.id === pokemon.id) === index,
    )
    .slice(0, limit);
}

function pokemonOptions(query: string, replaceFrom: number, replaceTo: number) {
  const matches = query
    ? searchPokemonEntities(query, 6).map((match) => match.entry)
    : getDefaultSpeedPokemonSuggestions(6);

  return matches.map((pokemon): SpeedAutocompleteOption => ({
    type: "pokemon",
    value: pokemon.name,
    label: pokemon.name,
    detail: `Base ${pokemon.baseStats.spe}`,
    replaceFrom,
    replaceTo,
    suffix: " ",
  }));
}

function selectedSideAbilities(side: SpeedSideState | null) {
  if (!side) return [];

  const pokemon = pokemonById.get(side.speciesId);
  if (!pokemon) return [];

  return pokemon.abilities
    .slice()
    .sort((left, right) => {
      const leftRelevant = SPEED_RELEVANT_ABILITIES.has(normalizeId(left));
      const rightRelevant = SPEED_RELEVANT_ABILITIES.has(normalizeId(right));

      if (leftRelevant === rightRelevant) return left.localeCompare(right);
      return leftRelevant ? -1 : 1;
    });
}

function hasEquivalentSideModifier(side: SpeedSideState, value: string) {
  const normalized = normalizeId(value);
  const hasNatureOverride =
    side.nature !== "neutral" ||
    side.overrides.some((override) => normalizeId(override).includes("nature"));

  if (normalized === "speed" || normalized === "neutral") {
    return hasNatureOverride;
  }

  if (normalized === "tailwind") {
    return side.tailwind;
  }

  if (normalized === "paralysis") {
    return side.paralysis;
  }

  if (normalized === "choicescarf") {
    return normalizeId(side.item ?? "") === "choicescarf";
  }

  if (/^spe-sp:\d{1,2}$/i.test(value)) {
    return side.speSp !== 32;
  }

  if (/^spe[+-][1-6]$/i.test(value)) {
    return side.speedStage !== 0;
  }

  return false;
}

export function getSpeedAutocompleteOptions(input: string): SpeedAutocompleteOption[] {
  const lexed = lexCommandInput(input);
  const parsed = parseSpeedCommand(input);
  const activeTokens = lexed.hasDelimiter ? lexed.defenderTokens : lexed.attackerTokens;
  const activeSide = lexed.hasDelimiter ? parsed.comparator : parsed.subject;
  const nonGlobalTokens = activeTokens.filter((token) => !token.raw.startsWith("~"));
  const lastToken = activeTokens[activeTokens.length - 1];
  const lastRaw = lexed.trailingWhitespace ? "" : (lastToken?.raw ?? "");
  const lastStartsGlobal = lastRaw.startsWith("~");

  if (!activeSide) {
    const replaceFrom = nonGlobalTokens[0]?.start ?? input.length;
    const replaceTo = nonGlobalTokens[nonGlobalTokens.length - 1]?.end ?? input.length;
    const query = nonGlobalTokens.map((token) => token.raw).join(" ");

    return pokemonOptions(query, replaceFrom, replaceTo);
  }

  const range = lastRaw && !lexed.trailingWhitespace
    ? {
        replaceFrom: lastToken?.start ?? input.length,
        replaceTo: lastToken?.end ?? input.length,
      }
    : appendRange(input);
  const query = lastRaw && !lexed.trailingWhitespace ? lastRaw : "";
  const suffix = lastRaw && !lexed.trailingWhitespace ? " " : appendSuffix(input);
  const globals = GLOBAL_MODIFIERS
    .filter((option) => lastStartsGlobal && optionMatches(option.value, query))
    .map((option): SpeedAutocompleteOption => ({
      ...option,
      type: "global",
      ...range,
      suffix: " ",
    }));

  if (globals.length) {
    return globals.slice(0, 6);
  }

  const separator = !lexed.hasDelimiter
    ? [{
        type: "separator" as const,
        value: "x",
        label: "Add Comparator",
        ...appendRange(input),
        suffix: " ",
      }]
    : [];
  const modifiers = SIDE_MODIFIERS
    .filter((option) => optionMatches(option.value, query))
    .filter((option) => !hasEquivalentSideModifier(activeSide, option.value))
    .map((option): SpeedAutocompleteOption => ({
      ...option,
      type: "modifier",
      ...range,
      suffix,
    }));
  const abilities = selectedSideAbilities(activeSide)
    .filter((ability) => optionMatches(ability, query))
    .map((ability): SpeedAutocompleteOption => ({
      type: "ability",
      value: ability,
      label: ability,
      detail: SPEED_RELEVANT_ABILITIES.has(normalizeId(ability))
        ? "Speed relevant"
        : undefined,
      ...range,
      suffix,
    }));
  const globalsFallback = GLOBAL_MODIFIERS
    .filter((option) => optionMatches(option.value, query))
    .map((option): SpeedAutocompleteOption => ({
      ...option,
      type: "global",
      ...range,
      suffix,
    }));

  return [...separator, ...modifiers, ...abilities, ...globalsFallback].slice(0, 8);
}

export function applySpeedAutocompleteOption(
  input: string,
  option: SpeedAutocompleteOption,
) {
  const next =
    input.slice(0, option.replaceFrom) +
    option.value +
    (option.suffix ?? "") +
    input.slice(option.replaceTo);

  return next.replace(/\s+/g, " ").trimStart();
}
