import { parseCommand } from "@/lib/parser/command-parser";

describe("parseCommand", () => {
  test("parses an explicit symbolic command", () => {
    const result = parseCommand("politoed !muddy-water x incineroar");

    expect(result.parsed).toMatchObject({
      attacker: "Politoed",
      defender: "Incineroar",
      move: "Muddy Water",
      attackerStatMod: 0,
    });
    expect(result.issues).toHaveLength(0);
  });

  test("requires an explicit attacker move", () => {
    const result = parseCommand("politoed x incineroar");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContain("Add an explicit attacker move with !<move>.");
  });

  test("parses compact attacker, defender and global modifiers", () => {
    const result = parseCommand(
      "politoed !muddy-water +1 +nature x incineroar +2 +nature reflect ~rain",
    );

    expect(result.parsed).toMatchObject({
      attackerStatMod: 1,
      defenderStatMod: 2,
      attackerNature: "Modest",
      defenderNature: "Calm",
      attackerInvestment: "auto",
      defenderInvestment: "auto",
    });
    expect(result.parsed?.globalEffects).toContain("rain");
    expect(result.parsed?.defenderSideEffects).toContain("reflect");
  });

  test("marks Make It Rain as a doubles spread move", () => {
    const result = parseCommand("charizard !heat-wave x tinkaton");

    expect(result.parsed?.move).toBe("Heat Wave");
    expect(result.parsed?.isDoubleTarget).toBe(true);
  });

  test("forces trick room into parsed global effects", () => {
    const result = parseCommand("charizard !heat-wave ~trick-room x incineroar");

    expect(result.parsed?.globalEffects).toContain("trick_room");
  });

  test("parses explicit scoped abilities", () => {
    const result = parseCommand(
      "politoed !muddy-water [Drizzle] x incineroar [Intimidate]",
    );

    expect(result.parsed).toMatchObject({
      attackerAbility: "Drizzle",
      defenderAbility: "Intimidate",
    });
  });

  test("parses attacker and defender items by segment position", () => {
    const result = parseCommand(
      "charizard !heat-wave @life-orb x tinkaton @assault-vest",
    );

    expect(result.parsed).toMatchObject({
      attackerItem: "Life Orb",
      defenderItem: "Assault Vest",
    });
    expect(result.issues).toHaveLength(0);
  });

  test("accepts fuzzy pokemon and move resolution inside symbolic grammar", () => {
    const result = parseCommand("politoe !mudy-water x incineroar");

    expect(result.parsed).toMatchObject({
      attacker: "Politoed",
      move: "Muddy Water",
      defender: "Incineroar",
    });
  });

  test("rejects low-confidence unresolved inputs", () => {
    const result = parseCommand("zzzzzz !muddy-water x incineroar");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContain("Could not resolve attacker.");
  });

  test("accepts legacy nature aliases and normalizes them", () => {
    const result = parseCommand(
      "politoed !muddy-water positive-nature x incineroar neg-nature",
    );

    expect(result.parsed).toMatchObject({
      attackerNature: "Modest",
      defenderNature: "Rash",
    });
  });

  test("clamps attacker and defender stages to the -6..+6 range", () => {
    const result = parseCommand(
      "politoed !muddy-water +6 +3 x incineroar -4 -5",
    );

    expect(result.parsed).toMatchObject({
      attackerStatMod: 6,
      defenderStatMod: -6,
    });
  });

  test("parses dedicated speed stage tokens for both sides", () => {
    const result = parseCommand(
      "charizard !heat-wave spe+4 x incineroar spe-2",
    );

    expect(result.parsed).toMatchObject({
      attackerSpeedMod: 4,
      defenderSpeedMod: -2,
    });
  });

  test("parses attacker and defender hp percentages plus critical hit", () => {
    const result = parseCommand(
      "politoed !muddy-water %75 * x incineroar %50",
    );

    expect(result.parsed).toMatchObject({
      attackerCurrentHpPercent: 75,
      defenderCurrentHpPercent: 50,
      isCriticalHit: true,
    });
  });

  test("parses explicit mega species names as attacker entities", () => {
    const result = parseCommand("charizard-mega-y !heat-wave x tinkaton");

    expect(result.parsed).toMatchObject({
      attacker: "Charizard-Mega-Y",
      move: "Heat Wave",
      defender: "Tinkaton",
    });
  });

  test("resolves Floette Eternal Flower as a distinct species", () => {
    const result = parseCommand("floette eternal flower !moonblast x incineroar");

    expect(result.parsed).toMatchObject({
      attacker: "Floette-Eternal",
      move: "Moonblast",
      defender: "Incineroar",
    });
  });

  test("rejects removed legacy side prefixes", () => {
    const result = parseCommand("politoed !muddy-water >+1 x incineroar");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContain(
      "Legacy prefixes >, <, a:, d:, and g: are no longer supported.",
    );
  });

  test("does not treat the x in mega x as the attacker-defender separator", () => {
    const result = parseCommand("charizard mega x !heat-wave x tinkaton");

    expect(result.parsed).toMatchObject({
      attacker: "Charizard-Mega-X",
      move: "Heat Wave",
      defender: "Tinkaton",
    });
  });
});
