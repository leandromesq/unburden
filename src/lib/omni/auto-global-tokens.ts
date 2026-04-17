import {
  normalizeAlias,
  pokemonById,
  vgcMetaByPokemonId,
} from "@/lib/data/loaders";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { parseCommand } from "@/lib/parser/command-parser";
import {
  GLOBAL_MODIFIER_MAP,
  buildCommonAbilities,
  formatModifierToken,
} from "@/lib/parser/grammar";
import {
  getAutoGlobalTokenForAbilityName,
  inferDefaultAbility,
} from "@/lib/parser/inference";
import { resolveSetReferenceToken } from "@/lib/team/set-references";
import type {
  ImportedSet,
  SuggestionOption,
} from "@/lib/types";

type AutoFieldCategory = "weather" | "terrain";

interface AutoGlobalState {
  key: string | null;
  tokens: string[];
}

interface AppliedAutoGlobalState {
  input: string;
  autoAppliedGlobalTokens: string[];
  autoGlobalContextKey: string | null;
  dismissedAutoGlobalContextKey: string | null;
}

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
  importedSets: Record<string, ImportedSet>,
) {
  const referenceSet = resolveSetReferenceToken(
    segment.leadingFreeTokens[0]?.raw,
    importedSets,
  );

  if (referenceSet && segment.leadingFreeTokens.length === 1) {
    return pokemonById.get(referenceSet.speciesId) ?? null;
  }

  if (segment.speciesExact) {
    return segment.speciesExact.entry;
  }

  if (segment.leadingRemainderTokens.length === 0) {
    return segment.speciesMatch?.entry ?? null;
  }

  return null;
}

function resolveParsedPokemonAbilities(pokemonId: string) {
  const profile = vgcMetaByPokemonId.get(pokemonId);
  const pokemon = pokemonById.get(pokemonId);
  const abilityPool = new Set<string>();

  for (const ability of pokemon?.abilities ?? []) {
    abilityPool.add(ability);
  }

  if (profile?.defaultAbility) {
    abilityPool.add(profile.defaultAbility);
  }

  for (const ability of profile?.commonAbilities ?? []) {
    abilityPool.add(ability);
  }

  return Array.from(abilityPool);
}

function resolveScopedAbilityName(
  pokemonId: string | undefined,
  explicitAbility: string | undefined,
) {
  if (!pokemonId) {
    return explicitAbility;
  }

  if (explicitAbility) {
    const profile = vgcMetaByPokemonId.get(pokemonId);
    const pokemonAbilities = resolveParsedPokemonAbilities(pokemonId);
    const knownAbilities = buildCommonAbilities(profile, pokemonAbilities);
    const normalized = normalizeAlias(explicitAbility);

    return (
      knownAbilities.find(
        (ability) => normalizeAlias(ability) === normalized,
      ) ?? explicitAbility
    );
  }

  return inferDefaultAbility(pokemonId) ?? undefined;
}

function getGlobalTokenCategory(token: string): AutoFieldCategory | null {
  const definition = GLOBAL_MODIFIER_MAP.get(token);

  if (!definition) {
    return null;
  }

  if (definition.section === "weather") {
    return "weather";
  }

  if (definition.section === "terrain") {
    return "terrain";
  }

  return null;
}

function deriveAutoGlobalState(
  input: string,
  importedSets: Record<string, ImportedSet>,
): AutoGlobalState {
  const structure = analyzeCommandStructure(input);
  const attacker = resolveParsedSpecies(structure.attacker, importedSets);
  const defender = resolveParsedSpecies(structure.defender, importedSets);

  if (!structure.lexed.hasDelimiter || !attacker || !defender) {
    return {
      key: null,
      tokens: [],
    };
  }

  const parsed = parseCommand(input, importedSets).parsed;

  if (
    !parsed ||
    !structure.attacker.speciesExact ||
    !structure.defender.speciesExact
  ) {
    return {
      key: null,
      tokens: [],
    };
  }

  const attackerAbility = resolveScopedAbilityName(
    attacker.id,
    structure.attacker.abilityToken?.value,
  );
  const defenderAbility = resolveScopedAbilityName(
    defender.id,
    structure.defender.abilityToken?.value,
  );

  const contextKey = [
    attacker.id,
    normalizeAlias(attackerAbility ?? ""),
    defender.id,
    normalizeAlias(defenderAbility ?? ""),
  ].join("|");

  const candidates = [
    {
      token: getAutoGlobalTokenForAbilityName(attackerAbility),
      speed: attacker.baseStats.spe,
    },
    {
      token: getAutoGlobalTokenForAbilityName(defenderAbility),
      speed: defender.baseStats.spe,
    },
  ]
    .map((candidate) => {
      if (!candidate.token) {
        return null;
      }

      const category = getGlobalTokenCategory(candidate.token);
      if (!category) {
        return null;
      }

      return {
        ...candidate,
        category,
      };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        token: string;
        speed: number;
        category: AutoFieldCategory;
      } => Boolean(candidate),
    );

  const desiredByCategory = new Map<AutoFieldCategory, typeof candidates>();

  for (const candidate of candidates) {
    const existing = desiredByCategory.get(candidate.category) ?? [];
    existing.push(candidate);
    desiredByCategory.set(candidate.category, existing);
  }

  const manualGlobalTokens = new Set(
    structure.globalTokens.map((token) => token.value),
  );
  const nextAutoTokens: string[] = [];

  for (const [category, entries] of desiredByCategory.entries()) {
    const hasManualCategoryToken = Array.from(manualGlobalTokens).some(
      (token) => getGlobalTokenCategory(token) === category,
    );

    if (hasManualCategoryToken) {
      continue;
    }

    const uniqueTokens = Array.from(
      new Set(entries.map((entry) => entry.token)),
    );

    if (uniqueTokens.length === 1) {
      nextAutoTokens.push(formatModifierToken("global", uniqueTokens[0]));
      continue;
    }

    const sorted = [...entries].sort((left, right) => left.speed - right.speed);
    const [slowest, secondSlowest] = sorted;

    if (!slowest || (secondSlowest && secondSlowest.speed === slowest.speed)) {
      continue;
    }

    nextAutoTokens.push(formatModifierToken("global", slowest.token));
  }

  return {
    key: contextKey,
    tokens: nextAutoTokens,
  };
}

export function applyAutoGlobalTokens(
  input: string,
  importedSets: Record<string, ImportedSet>,
  _previousAutoTokens: string[] = [],
  _previousContextKey: string | null = null,
  _previousDismissedContextKey: string | null = null,
): AppliedAutoGlobalState {
  void _previousAutoTokens;
  void _previousContextKey;
  void _previousDismissedContextKey;

  const autoState = deriveAutoGlobalState(input, importedSets);

  return {
    input,
    autoAppliedGlobalTokens: autoState.tokens,
    autoGlobalContextKey: autoState.key,
    dismissedAutoGlobalContextKey: null,
  };
}

function buildRecommendedGlobalOptions(
  input: string,
  recommendedTokens: string[],
): SuggestionOption[] {
  const baseInput = input.trimEnd();

  return recommendedTokens.map((token) => ({
    type: "modifier",
    value: token,
    label: token,
    applyText: baseInput ? `${baseInput} ${token}` : token,
  }));
}

export function prioritizeRecommendedGlobals(
  input: string,
  options: SuggestionOption[],
  recommendedTokens: string[],
) {
  if (!recommendedTokens.length || !options.length) {
    return recommendedTokens.length
      ? buildRecommendedGlobalOptions(input, recommendedTokens)
      : options;
  }

  const recommendedSet = new Set(recommendedTokens);
  const synthesized = buildRecommendedGlobalOptions(
    input,
    recommendedTokens,
  ).filter(
    (option) => !options.some((existing) => existing.value === option.value),
  );
  const prioritized = options.filter((option) =>
    recommendedSet.has(option.value),
  );
  const remaining = options.filter(
    (option) => !recommendedSet.has(option.value),
  );

  return [...synthesized, ...prioritized, ...remaining];
}
