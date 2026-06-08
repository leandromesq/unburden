import { resolveAttackerRepresentativeNature } from "@/lib/calc/move-stat-context";
import { allowedItemIds, itemDisplayById } from "@/lib/data/items";
import { moveById } from "@/lib/data/moves";
import { normalizeAlias, normalizeId } from "@/lib/data/normalization";
import { pokemonById } from "@/lib/data/pokemon";
import { vgcMetaByPokemonId } from "@/lib/data/vgc-meta";
import {
	analyzeCommandStructure,
	isKnownModifierToken,
} from "@/lib/parser/command-structure";
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
import { resolveSetReferenceToken } from "@/lib/team/set-references";
import { createIssue, uniqueIssues } from "@/lib/issues";
import type {
	ImportedSet,
	OmniIssue,
	ParsedCommand,
	PokemonEntry,
	StatSpread,
} from "@/lib/types";

function buildEmptyStageMods(): StatSpread {
	return {
		hp: 0,
		atk: 0,
		def: 0,
		spa: 0,
		spd: 0,
		spe: 0,
	};
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

	return abilities.find(
		(ability) => normalizeAlias(ability) === normalizedInput,
	);
}

function parseModifierCollections(
	attackerTokens: string[],
	defenderTokens: string[],
	globalTokens: string[],
) {
	let attackerStatMod = 0;
	let defenderStatMod = 0;
	const attackerStageMods = buildEmptyStageMods();
	const defenderStageMods = buildEmptyStageMods();
	let attackerRepresentativeNature: string | undefined;
	let defenderRepresentativeNature: string | undefined;
	let attackerExplicitNature: string | undefined;
	let defenderExplicitNature: string | undefined;
	let attackerStatus: ParsedCommand["attackerStatus"];
	let defenderStatus: ParsedCommand["defenderStatus"];
	let attackerInvestment: ParsedCommand["attackerInvestment"] = "auto";
	let defenderInvestment: ParsedCommand["defenderInvestment"] = "auto";
	let moveTargetMode: ParsedCommand["moveTargetMode"];
	const attackerSideEffects = new Set<
		ParsedCommand["attackerSideEffects"][number]
	>();
	const defenderSideEffects = new Set<
		ParsedCommand["defenderSideEffects"][number]
	>();
	const globalEffects = new Set<ParsedCommand["globalEffects"][number]>();

	for (const token of attackerTokens) {
		const definition = ATTACKER_MODIFIER_MAP.get(token);
		if (!definition) {
			continue;
		}

		if (definition.kind === "stat_mod") {
			attackerStatMod += definition.statMod ?? 0;
		} else if (
			(definition.kind === "stat_stage" || definition.kind === "speed_mod") &&
			definition.statKey
		) {
			attackerStageMods[definition.statKey] += definition.statMod ?? 0;
		} else if (definition.kind === "nature") {
			if (
				definition.nature === ATTACKER_POSITIVE_NATURE ||
				definition.nature === ATTACKER_NEGATIVE_NATURE
			) {
				attackerRepresentativeNature = definition.nature;
			} else {
				attackerExplicitNature = definition.nature;
			}
		} else if (definition.kind === "status") {
			attackerStatus = definition.status;
		} else if (definition.kind === "investment") {
			attackerInvestment =
				definition.investment as ParsedCommand["attackerInvestment"];
		} else if (definition.kind === "move_target") {
			moveTargetMode = definition.moveTargetMode;
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
		} else if (
			(definition.kind === "stat_stage" || definition.kind === "speed_mod") &&
			definition.statKey
		) {
			defenderStageMods[definition.statKey] += definition.statMod ?? 0;
		} else if (definition.kind === "nature") {
			if (
				definition.nature === DEFENDER_POSITIVE_NATURE ||
				definition.nature === DEFENDER_NEGATIVE_NATURE
			) {
				defenderRepresentativeNature = definition.nature;
			} else {
				defenderExplicitNature = definition.nature;
			}
		} else if (definition.kind === "status") {
			defenderStatus = definition.status;
		} else if (definition.kind === "investment") {
			defenderInvestment =
				definition.investment as ParsedCommand["defenderInvestment"];
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
		attackerStageMods: {
			...attackerStageMods,
			atk: Math.max(-6, Math.min(6, attackerStageMods.atk)),
			def: Math.max(-6, Math.min(6, attackerStageMods.def)),
			spa: Math.max(-6, Math.min(6, attackerStageMods.spa)),
			spd: Math.max(-6, Math.min(6, attackerStageMods.spd)),
			spe: Math.max(-6, Math.min(6, attackerStageMods.spe)),
		},
		defenderStageMods: {
			...defenderStageMods,
			atk: Math.max(-6, Math.min(6, defenderStageMods.atk)),
			def: Math.max(-6, Math.min(6, defenderStageMods.def)),
			spa: Math.max(-6, Math.min(6, defenderStageMods.spa)),
			spd: Math.max(-6, Math.min(6, defenderStageMods.spd)),
			spe: Math.max(-6, Math.min(6, defenderStageMods.spe)),
		},
		attackerSpeedMod: Math.max(-6, Math.min(6, attackerStageMods.spe)),
		defenderSpeedMod: Math.max(-6, Math.min(6, defenderStageMods.spe)),
		attackerNature: attackerExplicitNature ?? attackerRepresentativeNature,
		defenderNature: defenderExplicitNature ?? defenderRepresentativeNature,
		attackerStatus,
		defenderStatus,
		attackerInvestment,
		defenderInvestment,
		moveTargetMode,
		attackerSideEffects: Array.from(attackerSideEffects),
		defenderSideEffects: Array.from(defenderSideEffects),
		globalEffects: Array.from(globalEffects),
	};
}

function resolveAttackerNature(
	nature: string | undefined,
	moveId: string,
	moveCategory: string,
) {
	if (nature === ATTACKER_POSITIVE_NATURE) {
		return resolveAttackerRepresentativeNature(moveId, moveCategory, "boost");
	}

	if (nature === ATTACKER_NEGATIVE_NATURE) {
		return resolveAttackerRepresentativeNature(moveId, moveCategory, "nerf");
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

	return Math.max(0, Math.min(100, value));
}

function resolveAegislashCalcFormId(speciesText: string) {
	const normalizedSpeciesText = normalizeAlias(speciesText);

	if (!normalizedSpeciesText.includes("aegislash")) {
		return undefined;
	}

	if (/\b(?:blade|sword)\b/.test(normalizedSpeciesText)) {
		return "aegislashblade";
	}

	if (/\bshield\b/.test(normalizedSpeciesText)) {
		return "aegislashshield";
	}

	return undefined;
}

interface CommandParseResult {
	parsed: ParsedCommand | null;
	issues: OmniIssue[];
}

function isLegacyScopedToken(token: string) {
	return /^(?:[adg]:|>|<)/i.test(token);
}

export function parseCommand(
	input: string,
	importedSets: Record<string, ImportedSet> = {},
): CommandParseResult {
	const structure = analyzeCommandStructure(input);
	const issues: OmniIssue[] = [];
	const attackerReferenceSet = resolveSetReferenceToken(
		structure.attacker.leadingFreeTokens[0]?.raw,
		importedSets,
	);
	const defenderReferenceSet = resolveSetReferenceToken(
		structure.defender.leadingFreeTokens[0]?.raw,
		importedSets,
	);
	const attackerMatch = resolveParsedSpecies(structure.attacker);
	const defenderMatch = resolveParsedSpecies(structure.defender);
	const attackerEntry =
		(attackerReferenceSet
			? pokemonById.get(normalizeId(attackerReferenceSet.speciesId))
			: null) ??
		attackerMatch?.entry ??
		null;
	const defenderEntry =
		(defenderReferenceSet
			? pokemonById.get(normalizeId(defenderReferenceSet.speciesId))
			: null) ??
		defenderMatch?.entry ??
		null;
	const moveToken = structure.attacker.moveToken;
	const move = moveToken ? resolveMoveName(moveToken.value) : null;
	const attackerItem = resolveItemDisplay(structure.attacker.itemToken?.value);
	const defenderItem = resolveItemDisplay(structure.defender.itemToken?.value);

	if (!structure.lexed.hasDelimiter) {
		issues.push(createIssue("parser.use_separator"));
	}

	if (
		structure.attacker.leadingFreeTokens[0]?.raw.startsWith("#") &&
		!attackerReferenceSet
	) {
		issues.push(
			createIssue("parser.unknown_saved_set_reference", {
				reference: structure.attacker.leadingFreeTokens[0]?.raw,
			}),
		);
	}

	if (
		structure.defender.leadingFreeTokens[0]?.raw.startsWith("#") &&
		!defenderReferenceSet
	) {
		issues.push(
			createIssue("parser.unknown_saved_set_reference", {
				reference: structure.defender.leadingFreeTokens[0]?.raw,
			}),
		);
	}

	if (
		attackerReferenceSet &&
		structure.attacker.leadingRemainderTokens.length > 0
	) {
		issues.push(createIssue("parser.saved_set_reference_attacker_slot_only"));
	}

	if (
		defenderReferenceSet &&
		structure.defender.leadingRemainderTokens.length > 0
	) {
		issues.push(createIssue("parser.saved_set_reference_defender_slot_only"));
	}

	if (!attackerEntry) {
		issues.push(createIssue("parser.could_not_resolve_attacker"));
	}

	if (structure.lexed.hasDelimiter && !defenderEntry) {
		issues.push(createIssue("parser.could_not_resolve_defender"));
	}

	if (structure.attacker.postExplicitFreeTokens.length) {
		issues.push(createIssue("parser.invalid_attacker_post_move_tokens"));
	}

	if (structure.defender.postExplicitFreeTokens.length) {
		issues.push(createIssue("parser.invalid_defender_post_move_tokens"));
	}

	if (structure.attacker.leadingRemainderTokens.length && !moveToken) {
		issues.push(createIssue("parser.use_explicit_move_token"));
	}

	if (!moveToken) {
		issues.push(createIssue("parser.add_attacker_move"));
	} else if (moveToken && !move) {
		issues.push(createIssue("parser.could_not_resolve_move"));
	}

	if (moveToken?.hitCountInvalid) {
		issues.push(createIssue("parser.invalid_move_hit_count"));
	}

	if (structure.defender.leadingRemainderTokens.length) {
		issues.push(createIssue("parser.invalid_defender_token"));
	}

	const invalidExplicitTokens = [
		...structure.attacker.unknownExplicitTokens,
		...structure.defender.unknownExplicitTokens,
	];

	if (
		invalidExplicitTokens.some((token) => token.normalized.startsWith("sp:"))
	) {
		issues.push(createIssue("parser.invalid_spread"));
	}

	if (
		structure.attacker.misplacedTokens.length ||
		structure.defender.misplacedTokens.length
	) {
		issues.push(createIssue("parser.tokens_wrong_side"));
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
		issues.push(
			createIssue("parser.unknown_modifier", {
				token: unknownTokens[0].raw,
			}),
		);
	}

	if (structure.attacker.itemToken && !attackerItem) {
		issues.push(
			createIssue("parser.unknown_attacker_item", {
				token: structure.attacker.itemToken.raw,
			}),
		);
	}

	if (structure.defender.itemToken && !defenderItem) {
		issues.push(
			createIssue("parser.unknown_defender_item", {
				token: structure.defender.itemToken.raw,
			}),
		);
	}

	const legacyTokens = [
		...structure.attacker.leadingRemainderTokens,
		...structure.attacker.postExplicitFreeTokens,
		...structure.defender.leadingRemainderTokens,
		...structure.defender.postExplicitFreeTokens,
	].filter((token) => isLegacyScopedToken(token.raw));

	if (legacyTokens.length) {
		issues.push(createIssue("parser.legacy_prefixes_removed"));
	}

	if (
		!attackerEntry ||
		!defenderEntry ||
		!move ||
		legacyTokens.length ||
		moveToken?.hitCountInvalid ||
		invalidExplicitTokens.length
	) {
		return { parsed: null, issues: uniqueIssues(issues) };
	}

	const attackerAbility = resolveAbilityName(
		attackerEntry,
		structure.attacker.abilityToken?.value,
	);
	const defenderAbility = resolveAbilityName(
		defenderEntry,
		structure.defender.abilityToken?.value,
	);
	const attackerCurrentHpPercent = resolveCurrentHpPercent(
		structure.attacker.hpToken?.value,
	);
	const defenderCurrentHpPercent = resolveCurrentHpPercent(
		structure.defender.hpToken?.value,
	);
	const isCriticalHit = Boolean(
		structure.attacker.criticalToken || structure.defender.criticalToken,
	);

	if (structure.attacker.abilityToken && !attackerAbility) {
		issues.push(createIssue("parser.could_not_resolve_attacker_ability"));
	}

	if (structure.defender.abilityToken && !defenderAbility) {
		issues.push(createIssue("parser.could_not_resolve_defender_ability"));
	}

	const modifiers = parseModifierCollections(
		structure.attacker.modifierTokens.map((token) => token.value),
		structure.defender.modifierTokens.map((token) => token.value),
		structure.globalTokens.map((token) => token.value),
	);
	const attackerNature = resolveAttackerNature(
		modifiers.attackerNature,
		move.id,
		move.category,
	);
	const defenderNature = resolveDefenderNature(
		modifiers.defenderNature,
		move.category,
	);
	const isDoubleTarget =
		modifiers.moveTargetMode === "single"
			? false
			: modifiers.moveTargetMode === "multi"
				? move.isSpread
				: move.isSpread;

	return {
		parsed: {
			attacker: attackerEntry.name,
			move: move.name,
			defender: defenderEntry.name,
			attackerSetReferenceId: attackerReferenceSet?.speciesId,
			defenderSetReferenceId: defenderReferenceSet?.speciesId,
			attackerCalcFormId: resolveAegislashCalcFormId(
				structure.attacker.speciesText,
			),
			defenderCalcFormId: resolveAegislashCalcFormId(
				structure.defender.speciesText,
			),
			moveHitCount: moveToken?.hits,
			attackerStatPoints: structure.attacker.statPointToken?.spread,
			defenderStatPoints: structure.defender.statPointToken?.spread,
			attackerStatMod: modifiers.attackerStatMod,
			defenderStatMod: modifiers.defenderStatMod,
			attackerStageMods: modifiers.attackerStageMods,
			defenderStageMods: modifiers.defenderStageMods,
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
			isDoubleTarget,
			lastRespectsStacks: moveToken?.lastRespectsStacks,
			rageFistHits: moveToken?.rageFistHits,
			fickleBeamDouble: moveToken?.fickleBeamDouble,
			roundDouble: moveToken?.roundDouble,
			moveTargetMode: modifiers.moveTargetMode,
		},
		issues: uniqueIssues(issues),
	};
}
