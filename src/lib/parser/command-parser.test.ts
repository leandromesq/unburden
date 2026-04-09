import { parseCommand } from "@/lib/parser/command-parser";

describe("parseCommand", () => {
  test("parses an explicit symbolic command", () => {
    const result = parseCommand("flutter mane !moonblast x ogerpon");

    expect(result.parsed).toMatchObject({
      attacker: "Flutter Mane",
      defender: "Ogerpon-Wellspring",
      move: "Moonblast",
      attackerStatMod: 0,
    });
    expect(result.issues).toHaveLength(0);
  });

  test("requires an explicit attacker move", () => {
    const result = parseCommand("flutter mane x ogerpon");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContain("Add an explicit attacker move with !<move>.");
  });

  test("parses compact attacker, defender and global modifiers", () => {
    const result = parseCommand(
      "flutter mane !moonblast >+1 >+nature x ogerpon <+2 <+nature <reflect ~rain",
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
    const result = parseCommand("gholdengo !make-it-rain x incineroar");

    expect(result.parsed?.move).toBe("Make It Rain");
    expect(result.parsed?.isDoubleTarget).toBe(true);
  });

  test("forces trick room into parsed global effects", () => {
    const result = parseCommand("archaludon !electro-shot ~trick-room x amoonguss");

    expect(result.parsed?.globalEffects).toContain("trick_room");
  });

  test("parses explicit scoped abilities", () => {
    const result = parseCommand(
      "flutter mane !moonblast >[Protosynthesis] x ogerpon <[Water Absorb]",
    );

    expect(result.parsed).toMatchObject({
      attackerAbility: "Protosynthesis",
      defenderAbility: "Water Absorb",
    });
  });

  test("accepts fuzzy pokemon and move resolution inside symbolic grammar", () => {
    const result = parseCommand("fluter mane !moonblst x ogerpon");

    expect(result.parsed).toMatchObject({
      attacker: "Flutter Mane",
      move: "Moonblast",
      defender: "Ogerpon-Wellspring",
    });
  });

  test("rejects low-confidence unresolved inputs", () => {
    const result = parseCommand("zzzzzz !moonblast x ogerpon");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContain("Could not resolve attacker.");
  });

  test("accepts legacy nature aliases and normalizes them", () => {
    const result = parseCommand(
      "flutter mane !moonblast >positive-nature x ogerpon <neg-nature",
    );

    expect(result.parsed).toMatchObject({
      attackerNature: "Modest",
      defenderNature: "Rash",
    });
  });

  test("clamps attacker and defender stages to the -6..+6 range", () => {
    const result = parseCommand(
      "flutter mane !moonblast >+6 >+3 x ogerpon <-4 <-5",
    );

    expect(result.parsed).toMatchObject({
      attackerStatMod: 6,
      defenderStatMod: -6,
    });
  });

  test("parses attacker and defender hp percentages plus critical hit", () => {
    const result = parseCommand(
      "flutter mane !moonblast %75 * x ogerpon %50",
    );

    expect(result.parsed).toMatchObject({
      attackerCurrentHpPercent: 75,
      defenderCurrentHpPercent: 50,
      isCriticalHit: true,
    });
  });
});
