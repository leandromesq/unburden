import { normalizeImportedSet } from "@/lib/team/imported-set-utils";
import type {
	ImportedSet,
	SpeedBenchmarkShareState,
	SpeedGlobalState,
	SpeedSideState,
} from "@/lib/types";

const SPEED_GLOBAL_KEYS = [
	"sun",
	"rain",
	"sand",
	"snow",
	"electricTerrain",
	"trickRoom",
] as const satisfies ReadonlyArray<keyof SpeedGlobalState>;

const SPEED_SOURCES = new Set(["species", "saved-set", "shared-snapshot"]);
const SPEED_NATURES = new Set(["plus", "neutral", "minus"]);
const SPEED_ABILITY_ACTIVE_STATES = new Set(["unburden-active"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object";
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function isIntegerInRange(value: unknown, min: number, max: number) {
	return (
		Number.isInteger(value) && Number(value) >= min && Number(value) <= max
	);
}

export function parseImportedSetSnapshot(value: unknown): ImportedSet | null {
	if (!isRecord(value)) return null;

	const candidate = value;
	if (
		typeof candidate.speciesId !== "string" ||
		typeof candidate.speciesName !== "string" ||
		typeof candidate.level !== "number" ||
		typeof candidate.nature !== "string" ||
		!isRecord(candidate.statPoints) ||
		!isRecord(candidate.evs) ||
		!isRecord(candidate.ivs) ||
		!Array.isArray(candidate.moves)
	) {
		return null;
	}

	return normalizeImportedSet(candidate as unknown as ImportedSet);
}

function parseSpeedGlobals(value: unknown): SpeedGlobalState | null {
	if (!isRecord(value)) return null;

	const candidate = value as Record<string, unknown>;
	if (!SPEED_GLOBAL_KEYS.every((key) => typeof candidate[key] === "boolean")) {
		return null;
	}

	return SPEED_GLOBAL_KEYS.reduce((globals, key) => {
		globals[key] = Boolean(candidate[key]);
		return globals;
	}, {} as SpeedGlobalState);
}

function parseSpeedSideState(value: unknown): SpeedSideState | null {
	if (!isRecord(value)) return null;

	const candidate = value as Record<string, unknown>;
	const parsedSetSnapshot =
		candidate.setSnapshot === undefined
			? undefined
			: parseImportedSetSnapshot(candidate.setSnapshot);

	if (
		typeof candidate.source !== "string" ||
		!SPEED_SOURCES.has(candidate.source) ||
		typeof candidate.speciesId !== "string" ||
		!SPEED_NATURES.has(String(candidate.nature)) ||
		!isIntegerInRange(candidate.speSp, 0, 32) ||
		!isIntegerInRange(candidate.speedStage, -6, 6) ||
		typeof candidate.tailwind !== "boolean" ||
		typeof candidate.paralysis !== "boolean" ||
		!isStringArray(candidate.overrides) ||
		!isStringArray(candidate.abilityActiveStates) ||
		!candidate.abilityActiveStates.every((state) =>
			SPEED_ABILITY_ACTIVE_STATES.has(state),
		) ||
		(candidate.sourceLabel !== undefined &&
			typeof candidate.sourceLabel !== "string") ||
		(candidate.item !== undefined && typeof candidate.item !== "string") ||
		(candidate.ability !== undefined &&
			typeof candidate.ability !== "string") ||
		(candidate.setSnapshot !== undefined && !parsedSetSnapshot)
	) {
		return null;
	}

	return {
		source: candidate.source as SpeedSideState["source"],
		sourceLabel: candidate.sourceLabel as string | undefined,
		setSnapshot: parsedSetSnapshot ?? undefined,
		speciesId: candidate.speciesId,
		item: candidate.item as string | undefined,
		ability: candidate.ability as string | undefined,
		abilityActiveStates:
			candidate.abilityActiveStates as SpeedSideState["abilityActiveStates"],
		nature: candidate.nature as SpeedSideState["nature"],
		speSp: Number(candidate.speSp),
		speedStage: Number(candidate.speedStage),
		tailwind: candidate.tailwind,
		paralysis: candidate.paralysis,
		overrides: candidate.overrides,
	};
}

export function parseSpeedBenchmarkShareState(
	value: unknown,
): SpeedBenchmarkShareState | null {
	if (!isRecord(value)) return null;

	const candidate = value as Record<string, unknown>;
	const subject =
		candidate.subject === null ? null : parseSpeedSideState(candidate.subject);
	const comparator =
		candidate.comparator === null
			? null
			: parseSpeedSideState(candidate.comparator);
	const globals = parseSpeedGlobals(candidate.globals);

	if (
		typeof candidate.command !== "string" ||
		!globals ||
		(candidate.subject !== null && !subject) ||
		(candidate.comparator !== null && !comparator) ||
		(candidate.focusedTierSpeed !== null &&
			typeof candidate.focusedTierSpeed !== "number")
	) {
		return null;
	}

	return {
		command: candidate.command,
		subject,
		comparator,
		globals,
		focusedTierSpeed: candidate.focusedTierSpeed,
	};
}
