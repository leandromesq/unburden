import {
  buildPinnedSpeedComparator,
  buildSpeedTierGroups,
  resolveSpeedSide,
} from "@/lib/speed/speed-benchmark";
import { DEFAULT_SPEED_GLOBALS, parseSpeedCommand } from "@/lib/speed/speed-command";

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
