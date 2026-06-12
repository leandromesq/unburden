import {
  buildPinnedSpeedComparator,
  buildSpeedTierGroups,
  buildSpeedUsageTierGroups,
  createSpeedSideFromBenchmark,
  resolveSpeedSide,
} from "@/lib/speed/speed-benchmark";
import { DEFAULT_SPEED_GLOBALS, parseSpeedCommand } from "@/lib/speed/speed-command";
import type { VgcMetaProfile } from "@/lib/types";

describe("speed benchmark grouping", () => {
  test("marks explicit comparators outside generated tiers as pinned", () => {
    const parsed = parseSpeedCommand("basculegion x aerodactyl tailwind");
    const subjectMetrics = resolveSpeedSide(parsed.subject!, DEFAULT_SPEED_GLOBALS);
    const comparatorMetrics = resolveSpeedSide(
      parsed.comparator!,
      DEFAULT_SPEED_GLOBALS,
    );
    const groups = buildSpeedTierGroups(
      DEFAULT_SPEED_GLOBALS,
      subjectMetrics?.effectiveSpeed ?? null,
    );
    const pinned = buildPinnedSpeedComparator(
      groups,
      comparatorMetrics,
      subjectMetrics?.effectiveSpeed ?? null,
      DEFAULT_SPEED_GLOBALS.trickRoom,
    );

    expect(pinned).not.toBeNull();
    expect(pinned?.matchesGeneratedTier).toBe(false);
    expect(pinned?.speed).toBe(comparatorMetrics?.effectiveSpeed);
  });

  test("keeps the standard max-Speed baseline separate from expressive Choice Scarf copies", () => {
    const profiles: VgcMetaProfile[] = [
      {
        pokemonId: "charizard",
        usageRank: 1,
        usagePercent: 0.1,
        defaultItem: "Choice Scarf",
        defaultAbility: "Blaze",
        defaultMove: "Heat Wave",
        itemUsages: [{ item: "Choice Scarf", usagePercent: 80 }],
      },
      {
        pokemonId: "meowscarada",
        usageRank: 2,
        usagePercent: 2.2,
        defaultItem: "Choice Scarf",
        defaultAbility: "Protean",
        defaultMove: "Flower Trick",
        itemUsages: [{ item: "Choice Scarf", usagePercent: 50 }],
      },
    ];

    const groups = buildSpeedTierGroups(DEFAULT_SPEED_GLOBALS, null, profiles);
    const members = groups.flatMap((group) => group.members);
    const charizardMembers = members.filter(
      (member) => member.profile.pokemonId === "charizard",
    );
    const meowscaradaMembers = members.filter(
      (member) => member.profile.pokemonId === "meowscarada",
    );

    expect(charizardMembers).toHaveLength(1);
    expect(charizardMembers[0]).toMatchObject({ speed: 167, item: undefined });
    expect(meowscaradaMembers.map((member) => member.speed).sort()).toEqual([
      192,
      288,
    ]);
    expect(meowscaradaMembers.some((member) => member.item === "Choice Scarf")).toBe(true);
  });

  test("builds optional Speed usage tiers from Meta Profile speed spreads", () => {
    const profiles: VgcMetaProfile[] = [
      {
        pokemonId: "basculegion",
        usageRank: 1,
        usagePercent: 30,
        defaultItem: "Mystic Water",
        defaultAbility: "Swift Swim",
        defaultMove: "Wave Crash",
        speedUsages: [
          { nature: "Jolly", speSp: 32, usagePercent: 45 },
          { nature: "Adamant", speSp: 18, usagePercent: 20 },
        ],
      },
      {
        pokemonId: "incineroar",
        usageRank: 2,
        usagePercent: 20,
        defaultItem: "Safety Goggles",
        defaultAbility: "Intimidate",
        defaultMove: "Fake Out",
      },
    ];

    const groups = buildSpeedUsageTierGroups(DEFAULT_SPEED_GLOBALS, null, profiles);

    expect(groups).toHaveLength(2);
    expect(groups[0].representative.profile.pokemonId).toBe("basculegion");
    expect(groups[0].representative.usagePercent).toBe(45);
    expect(groups.every((group) => group.members.length === 1)).toBe(true);

    expect(createSpeedSideFromBenchmark(groups[0].representative)).toMatchObject({
      speciesId: "basculegion",
      item: undefined,
      nature: "plus",
      speSp: 32,
    });
  });

  test("keeps generated tier grouping unchanged when comparator matches a tier", () => {
    const parsed = parseSpeedCommand("basculegion x aerodactyl +speed");
    const subjectMetrics = resolveSpeedSide(parsed.subject!, DEFAULT_SPEED_GLOBALS);
    const comparatorMetrics = resolveSpeedSide(
      parsed.comparator!,
      DEFAULT_SPEED_GLOBALS,
    );
    const groups = buildSpeedTierGroups(
      DEFAULT_SPEED_GLOBALS,
      subjectMetrics?.effectiveSpeed ?? null,
    );
    const pinned = buildPinnedSpeedComparator(
      groups,
      comparatorMetrics,
      subjectMetrics?.effectiveSpeed ?? null,
      DEFAULT_SPEED_GLOBALS.trickRoom,
    );

    expect(pinned?.matchesGeneratedTier).toBe(true);
    expect(groups.some((group) => group.speed === pinned?.speed)).toBe(true);
  });
});
