import { itemDisplayById } from "@/lib/data/items";
import { normalizeAlias, normalizeId } from "@/lib/data/normalization";
import { legalPokemonData } from "@/lib/data/pokemon";
import { vgcMetaByPokemonId } from "@/lib/data/vgc-meta";
import { resolveExactPokemonEntity } from "@/lib/parser/fuse-indexes";
import { buildCommonAbilities } from "@/lib/parser/grammar";
import type { PokemonEntry } from "@/lib/types";

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

export interface ResolvedPokemonTokens {
	pokemon: PokemonEntry;
	consumed: number;
}

export function resolvePokemonFromLeadingTokens(
	tokens: string[],
): ResolvedPokemonTokens | null {
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

export function resolveItemNameFromToken(token: string) {
	const normalized = normalizeId(token.replace(/^@/, ""));
	return itemNames.find((name) => normalizeId(name) === normalized);
}

export function resolveItemNameFromLeadingTokens(
	tokens: string[],
	maxLength = 3,
) {
	for (
		let length = Math.min(maxLength, tokens.length);
		length >= 1;
		length -= 1
	) {
		const item = resolveItemNameFromToken(tokens.slice(0, length).join(" "));

		if (item) {
			return { item, consumed: length };
		}
	}

	return null;
}

export function getPokemonAbilityNames(pokemonId: string) {
	const profile = vgcMetaByPokemonId.get(pokemonId);
	const abilityPool = new Set<string>();

	for (const ability of legalPokemonData.find(
		(pokemon) => pokemon.id === pokemonId,
	)?.abilities ?? []) {
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

export function resolvePokemonAbilityName(
	pokemon: PokemonEntry,
	token: string,
) {
	const body =
		token.startsWith("[") && token.endsWith("]") ? token.slice(1, -1) : token;
	const normalized = normalizeAlias(body);
	const knownAbilities = buildCommonAbilities(
		vgcMetaByPokemonId.get(pokemon.id),
		getPokemonAbilityNames(pokemon.id),
	);

	return knownAbilities.find(
		(ability) => normalizeAlias(ability) === normalized,
	);
}
