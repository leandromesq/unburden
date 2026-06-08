import { parseSpeedShareState } from "@/lib/share/parse-share-state";
import type { ShareState, SpeedBenchmarkShareState } from "@/lib/types";

function encodeBase64Url(value: string) {
	return Buffer.from(value, "utf-8")
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function encodeShareState(payload: ShareState) {
	return encodeBase64Url(JSON.stringify(payload));
}

const validSubject = {
	source: "species" as const,
	speciesId: "basculegion",
	abilityActiveStates: [],
	nature: "neutral" as const,
	speSp: 32,
	speedStage: 0,
	tailwind: false,
	paralysis: false,
	overrides: [],
};

const validSpeedState: SpeedBenchmarkShareState = {
	command: "Basculegion x Aerodactyl ~rain",
	subject: validSubject,
	comparator: null,
	globals: {
		sun: false,
		rain: true,
		sand: false,
		snow: false,
		electricTerrain: false,
		trickRoom: false,
	},
	focusedTierSpeed: null,
};

describe("share state parsing", () => {
	test("parses valid Speed Benchmark share state", () => {
		const parsed = parseSpeedShareState(
			encodeShareState({
				v: 2,
				page: "speed",
				state: validSpeedState,
			}),
		);

		expect(parsed?.command).toBe(validSpeedState.command);
		expect(parsed?.subject?.speciesId).toBe("basculegion");
		expect(parsed?.globals.rain).toBe(true);
	});

	test("rejects invalid Speed Benchmark side ranges", () => {
		const parsed = parseSpeedShareState(
			encodeShareState({
				v: 2,
				page: "speed",
				state: {
					...validSpeedState,
					subject: {
						...validSubject,
						speSp: 99,
					},
				},
			}),
		);

		expect(parsed).toBeNull();
	});
});
