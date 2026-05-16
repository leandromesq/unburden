import {
  formatSpeedCommand,
  parseSpeedCommand,
} from "@/lib/speed/speed-command";

describe("speed command parser", () => {
  test("parses subject, explicit comparator, side modifiers, and globals", () => {
    const parsed = parseSpeedCommand(
      "basculegion choice scarf x aerodactyl -1 tailwind ~rain",
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.subject?.speciesId).toBe("basculegion");
    expect(parsed.subject?.item).toBe("Choice Scarf");
    expect(parsed.comparator?.speciesId).toBe("aerodactyl");
    expect(parsed.comparator?.speedStage).toBe(-1);
    expect(parsed.comparator?.tailwind).toBe(true);
    expect(parsed.globals.rain).toBe(true);
  });

  test("keeps side-specific modifiers on their own side", () => {
    const parsed = parseSpeedCommand(
      "aerodactyl tailwind spe-sp:20 x incineroar paralysis ~trick-room",
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.subject?.tailwind).toBe(true);
    expect(parsed.subject?.speSp).toBe(20);
    expect(parsed.subject?.paralysis).toBe(false);
    expect(parsed.comparator?.tailwind).toBe(false);
    expect(parsed.comparator?.paralysis).toBe(true);
    expect(parsed.globals.trickRoom).toBe(true);
  });

  test("formats commands without default SP and neutral nature", () => {
    const parsed = parseSpeedCommand("basculegion +nature x aerodactyl spe+1");

    expect(formatSpeedCommand(parsed.subject, parsed.comparator, parsed.globals))
      .toBe("Basculegion +speed x Aerodactyl spe+1");
  });

  test("formats explicit item overrides as compact item tokens", () => {
    const parsed = parseSpeedCommand("basculegion choice scarf x aerodactyl");

    expect(formatSpeedCommand(parsed.subject, parsed.comparator, parsed.globals))
      .toBe("Basculegion @choice-scarf x Aerodactyl");
  });
});
