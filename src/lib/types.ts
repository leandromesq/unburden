export interface RegulationEntry {
	id: string;
	name: string;
	seasons: string[];
	dateRange: string;
	allowedPokemonIds: string[];
}

export interface ActiveRegulationConfig {
	regulationId: string;
	rosterHash?: string;
	formatId?: string;
	lastVerified?: string;
}

export type BulkArchetype = "glass" | "mid" | "tank";
export type PokemonStatus = "brn" | "par" | "psn" | "slp" | "frz";
type OmniIssueId =
	| "parser.use_separator"
	| "parser.unknown_saved_set_reference"
	| "parser.saved_set_reference_attacker_slot_only"
	| "parser.saved_set_reference_defender_slot_only"
	| "parser.could_not_resolve_attacker"
	| "parser.could_not_resolve_defender"
	| "parser.invalid_attacker_post_move_tokens"
	| "parser.invalid_defender_post_move_tokens"
	| "parser.use_explicit_move_token"
	| "parser.add_attacker_move"
	| "parser.could_not_resolve_move"
	| "parser.invalid_move_hit_count"
	| "parser.invalid_defender_token"
	| "parser.invalid_spread"
	| "parser.tokens_wrong_side"
	| "parser.unknown_modifier"
	| "parser.unknown_attacker_item"
	| "parser.unknown_defender_item"
	| "parser.legacy_prefixes_removed"
	| "parser.could_not_resolve_attacker_ability"
	| "parser.could_not_resolve_defender_ability";

export interface OmniIssue {
	id: OmniIssueId;
	values?: Record<string, number | string>;
}

export type GlobalEffect =
	| "rain"
	| "sun"
	| "sand"
	| "snow"
	| "electric_terrain"
	| "grassy_terrain"
	| "psychic_terrain"
	| "misty_terrain"
	| "trick_room"
	| "gravity";

export type SideEffect =
	| "reflect"
	| "light_screen"
	| "aurora_veil"
	| "protect"
	| "helping_hand"
	| "tailwind"
	| "friend_guard"
	| "battery"
	| "power_spot";

type SuggestionSlot =
	| "attacker_pokemon"
	| "attacker_move"
	| "attacker_modifier_or_item_or_ability"
	| "separator"
	| "defender_pokemon"
	| "defender_modifier_or_item_or_ability"
	| "global_modifier";

export interface VgcMetaSpeedUsage {
	nature: string;
	speSp: number;
	usagePercent: number;
}

export interface VgcMetaItemUsage {
	item: string;
	usagePercent: number;
}

export interface VgcMetaProfile {
	pokemonId: string;
	usageRank: number;
	usagePercent?: number;
	defaultItem: string;
	defaultAbility: string;
	defaultMove: string;
	commonMoves?: string[];
	commonAbilities?: string[];
	commonItems?: string[];
	itemUsages?: VgcMetaItemUsage[];
	speedUsages?: VgcMetaSpeedUsage[];
}

export interface ParsedCommand {
	attacker: string;
	move: string;
	defender: string;
	attackerSetReferenceId?: string;
	defenderSetReferenceId?: string;
	attackerCalcFormId?: string;
	defenderCalcFormId?: string;
	moveHitCount?: number;
	attackerStatPoints?: StatSpread;
	defenderStatPoints?: StatSpread;
	attackerStatMod: number;
	defenderStatMod: number;
	attackerStageMods: StatSpread;
	defenderStageMods: StatSpread;
	attackerSpeedMod: number;
	defenderSpeedMod: number;
	attackerCurrentHpPercent?: number;
	defenderCurrentHpPercent?: number;
	attackerStatus?: PokemonStatus;
	defenderStatus?: PokemonStatus;
	isCriticalHit: boolean;
	globalEffects: GlobalEffect[];
	attackerSideEffects: SideEffect[];
	defenderSideEffects: SideEffect[];
	attackerItem?: string;
	defenderItem?: string;
	attackerNature?: string;
	attackerAbility?: string;
	defenderNature?: string;
	defenderAbility?: string;
	attackerInvestment?: "auto" | "max_atk" | "max_spa";
	defenderInvestment?: "auto" | "max_def" | "max_spd";
	isDoubleTarget: boolean;
	lastRespectsStacks?: number;
	rageFistHits?: number;
	fickleBeamDouble?: boolean;
	roundDouble?: boolean;
	moveTargetMode?: "single" | "multi";
}

interface DamageRoll {
	damage: number;
	percentage: number;
}

export interface DamageResult {
	archetype: BulkArchetype;
	label?: string;
	summary: string;
	minPercentage: number;
	maxPercentage: number;
	koChanceText: string;
	showdownText: string;
	contextText: string;
	damageText: string;
	damageRolls: DamageRoll[];
	assumptions: string[];
}

export interface PokemonEntry {
	id: string;
	name: string;
	aliases: string[];
	types: string[];
	abilities: string[];
	isMega?: boolean;
	requiredItem?: string;
	baseSpeciesId?: string;
	baseStats: {
		hp: number;
		atk: number;
		def: number;
		spa: number;
		spd: number;
		spe: number;
	};
	defaultFormOf?: string;
}

export interface MoveEntry {
	id: string;
	name: string;
	aliases: string[];
	type: string;
	category: string;
	basePower: number;
	accuracy: number | null;
	target: string;
	isSpread: boolean;
}

export interface LearnsetEntry {
	pokemonId: string;
	moveIds: string[];
}

export interface ItemEntry {
	id: string;
	name: string;
}

export interface FormAliasEntry {
	alias: string;
	pokemonId: string;
}

export interface SuggestionState {
	slot: SuggestionSlot;
	ghostText: string;
	completionText: string;
}

export interface SuggestionOption {
	type:
		| "pokemon"
		| "move"
		| "ability"
		| "modifier"
		| "separator"
		| "item"
		| "set";
	value: string;
	label: string;
	applyText: string;
	cursorOffset?: number;
}

export interface ActiveChipTokens {
	attacker: string[];
	defender: string[];
	global: string[];
}

export interface StatSpread {
	hp: number;
	atk: number;
	def: number;
	spa: number;
	spd: number;
	spe: number;
}

export interface ImportedSet {
	speciesId: string;
	speciesName: string;
	nickname?: string;
	gender?: "M" | "F" | "N";
	item?: string;
	ability?: string;
	level: number;
	nature: string;
	statPoints: StatSpread;
	evs: StatSpread;
	ivs: StatSpread;
	moves: string[];
	teraType?: string;
}

export type SpeedNatureBucket = "plus" | "neutral" | "minus";

type SpeedBenchmarkSource = "species" | "saved-set" | "shared-snapshot";

export type SpeedAbilityActiveState = "unburden-active";

export interface SpeedSideState {
	source: SpeedBenchmarkSource;
	sourceLabel?: string;
	setSnapshot?: ImportedSet;
	speciesId: string;
	item?: string;
	ability?: string;
	abilityActiveStates: SpeedAbilityActiveState[];
	nature: SpeedNatureBucket;
	speSp: number;
	speedStage: number;
	tailwind: boolean;
	paralysis: boolean;
	overrides: string[];
}

export interface SpeedGlobalState {
	sun: boolean;
	rain: boolean;
	sand: boolean;
	snow: boolean;
	electricTerrain: boolean;
	trickRoom: boolean;
}

export interface SpeedBenchmarkShareState {
	command: string;
	subject: SpeedSideState | null;
	comparator: SpeedSideState | null;
	globals: SpeedGlobalState;
	focusedTierSpeed: number | null;
}

export type ShareState =
	| {
			v: 1;
			sets: ImportedSet[];
	  }
	| {
			v: 2;
			page: "speed";
			state: SpeedBenchmarkShareState;
	  };
