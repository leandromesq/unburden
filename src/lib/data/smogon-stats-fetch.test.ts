import {
	buildSmogonChaosStatsUrl,
	parseSmogonMetaRecords,
	parseSmogonStatsMonths,
	usageMapToEntries,
	type SmogonChaosStats,
} from "../../../scripts/fetch/fetch-smogon-stats";
import {
	resolveDefaultAbility,
	resolveMoveProfile,
	type MoveEntry,
} from "../../../scripts/transform/build-vgc-meta";

describe("Smogon stats fetch helpers", () => {
	it("builds Smogon chaos stats URLs", () => {
		expect(
			buildSmogonChaosStatsUrl({
				month: "2026-05",
				format: "championsvgc2026regma",
				cutoff: 1500,
			}),
		).toBe(
			"https://www.smogon.com/stats/2026-05/chaos/gen9championsvgc2026regma-1500.json",
		);
	});

	it("parses latest months newest first", () => {
		expect(
			parseSmogonStatsMonths(`
        <a href="2026-04/">2026-04/</a>
        <a href="2026-05/">2026-05/</a>
      `),
		).toEqual(["2026-05", "2026-04"]);
	});

	it("sorts usage maps by weighted usage", () => {
		expect(
			usageMapToEntries({ protect: 20, closecombat: 40, fakeout: 40 }),
		).toEqual([
			{ name: "closecombat", usage: 40 },
			{ name: "fakeout", usage: 40 },
			{ name: "protect", usage: 20 },
		]);
	});

	it("normalizes Smogon chaos stats into meta records", () => {
		const stats: SmogonChaosStats = {
			info: {
				metagame: "gen9championsvgc2026regma",
				cutoff: 1500,
				"number of battles": 100,
			},
			data: {
				Sneasler: {
					"Raw count": 50,
					usage: 0.25,
					"Viability Ceiling": [0, 0, 0, 0],
					Abilities: { unburden: 80, poisontouch: 20 },
					Items: { whiteherb: 60, focussash: 40 },
					Moves: { closecombat: 90, protect: 80 },
				},
			},
		};

		expect(parseSmogonMetaRecords(stats)).toEqual([
			{
				speciesName: "Sneasler",
				usagePercent: 25,
				abilities: [
					{ name: "unburden", usage: 80 },
					{ name: "poisontouch", usage: 20 },
				],
				items: [
					{ name: "whiteherb", usage: 60 },
					{ name: "focussash", usage: 40 },
				],
				moves: [
					{ name: "closecombat", usage: 90 },
					{ name: "protect", usage: 80 },
				],
			},
		]);
	});

	it("canonicalizes Smogon ability ids to local display ability names", () => {
		expect(
			resolveDefaultAbility(
				[
					{ name: "unburden", usage: 80 },
					{ name: "poisontouch", usage: 20 },
				],
				{
					id: "sneasler",
					name: "Sneasler",
					aliases: [],
					types: ["Fighting", "Poison"],
					abilities: ["Poison Touch", "Unburden", "Pressure"],
				},
				undefined,
				3,
			),
		).toEqual({
			defaultAbility: "Unburden",
			commonAbilities: ["Unburden", "Poison Touch"],
		});
	});

	it("uses the most-used move as the default move", () => {
		const moves: MoveEntry[] = [
			{
				id: "protect",
				name: "Protect",
				aliases: ["protect"],
				type: "Normal",
				category: "Status",
				basePower: 0,
			},
			{
				id: "flareblitz",
				name: "Flare Blitz",
				aliases: ["flare blitz", "flareblitz"],
				type: "Fire",
				category: "Physical",
				basePower: 120,
			},
		];
		const moveIndex = new Map(
			moves.flatMap((move) =>
				[move.id, move.name, ...move.aliases].map((alias) => [alias, move]),
			),
		);

		expect(
			resolveMoveProfile(
				[
					{ name: "protect", usage: 90 },
					{ name: "flareblitz", usage: 80 },
				],
				moveIndex,
				undefined,
				2,
			),
		).toEqual({
			defaultMove: "Protect",
			commonMoves: ["Protect", "Flare Blitz"],
		});
	});
});
