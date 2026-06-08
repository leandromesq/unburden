import {
	buildCustomSetArchetypeConfig,
	getArchetypeConfigs,
} from "@/lib/calc/archetypes";
import type { ImportedSet, PokemonEntry } from "@/lib/types";

function createPokemon(overrides: Partial<PokemonEntry> = {}): PokemonEntry {
	return {
		id: "incineroar",
		name: "Incineroar",
		aliases: ["incineroar"],
		types: ["Fire", "Dark"],
		abilities: ["Intimidate"],
		baseStats: {
			hp: 95,
			atk: 115,
			def: 90,
			spa: 80,
			spd: 90,
			spe: 60,
		},
		...overrides,
	};
}

function createImportedSet(overrides: Partial<ImportedSet> = {}): ImportedSet {
	return {
		speciesId: "incineroar",
		speciesName: "Incineroar",
		level: 50,
		nature: "Careful",
		statPoints: {
			hp: 32,
			atk: 0,
			def: 4,
			spa: 0,
			spd: 20,
			spe: 10,
		},
		evs: {
			hp: 252,
			atk: 0,
			def: 32,
			spa: 0,
			spd: 160,
			spe: 80,
		},
		ivs: {
			hp: 31,
			atk: 31,
			def: 31,
			spa: 31,
			spd: 31,
			spe: 31,
		},
		moves: ["Fake Out", "Flare Blitz", "Parting Shot", "Knock Off"],
		...overrides,
	};
}

describe("archetypes", () => {
	describe("getArchetypeConfigs", () => {
		test.each([
			"Physical",
			"Special",
		] as const)("returns the three default defensive archetypes for %s moves", (moveCategory) => {
			const defender = createPokemon();

			const configs = getArchetypeConfigs(defender, moveCategory);

			expect(configs).toHaveLength(3);
			expect(configs.map((config) => config.archetype)).toEqual([
				"glass",
				"mid",
				"tank",
			]);
		});

		test("prefers Defense investment for physical moves", () => {
			const defender = createPokemon();

			const configs = getArchetypeConfigs(defender, "Physical");
			const tank = configs[2];

			expect(tank.nature).toBe("Bold");
			expect(tank.evs).toEqual({
				hp: 252,
				atk: 0,
				def: 252,
				spa: 0,
				spd: 4,
				spe: 0,
			});
		});

		test("prefers Special Defense investment for special moves", () => {
			const defender = createPokemon();

			const configs = getArchetypeConfigs(defender, "Special");
			const tank = configs[2];

			expect(tank.nature).toBe("Calm");
			expect(tank.evs).toEqual({
				hp: 252,
				atk: 0,
				def: 4,
				spa: 0,
				spd: 252,
				spe: 0,
			});
		});

		test("uses a defensive nature hint to keep Defense-focused tank spreads", () => {
			const defender = createPokemon();

			const configs = getArchetypeConfigs(defender, "Special", "Bold");
			const tank = configs[2];

			expect(tank.nature).toBe("Bold");
			expect(tank.evs.def).toBe(252);
			expect(tank.evs.spd).toBe(4);
		});

		test("custom nature overrides the tank default nature", () => {
			const defender = createPokemon();

			const configs = getArchetypeConfigs(defender, "Physical", "Careful");
			const tank = configs[2];

			expect(tank.nature).toBe("Careful");
			expect(tank.evs).toEqual({
				hp: 252,
				atk: 0,
				def: 4,
				spa: 0,
				spd: 252,
				spe: 0,
			});
		});

		test("max_def investment forces Defense tank regardless of move category", () => {
			const defender = createPokemon();

			const configs = getArchetypeConfigs(
				defender,
				"Special",
				undefined,
				"max_def",
			);
			const tank = configs[2];

			expect(tank.evs.def).toBe(252);
			expect(tank.evs.spd).toBe(4);
			expect(tank.nature).toBe("Bold");
		});

		test("max_spd investment forces Special Defense tank regardless of move category", () => {
			const defender = createPokemon();

			const configs = getArchetypeConfigs(
				defender,
				"Physical",
				undefined,
				"max_spd",
			);
			const tank = configs[2];

			expect(tank.evs.def).toBe(4);
			expect(tank.evs.spd).toBe(252);
			expect(tank.nature).toBe("Calm");
		});
	});

	describe("buildCustomSetArchetypeConfig", () => {
		test("builds a custom mid archetype from an imported set", () => {
			const importedSet = createImportedSet();

			const config = buildCustomSetArchetypeConfig(importedSet);

			expect(config.archetype).toBe("mid");
			expect(config.label).toBe("Custom Set");
			expect(config.isCustom).toBe(true);
			expect(config.evs).toEqual(importedSet.evs);
			expect(config.ivs).toEqual(importedSet.ivs);
			expect(config.nature).toBe(importedSet.nature);
			expect(config.summary).toContain(importedSet.nature);
		});
	});
});
