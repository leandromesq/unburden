import { buildCalculationContext, calculateDamageResults } from "@/lib/calc/damage-engine";
import { parseCommand } from "@/lib/parser/command-parser";

describe("damage engine", () => {
  test("returns three archetype rows for an explicit symbolic command", () => {
    const parsed = parseCommand("flutter mane !moonblast x ogerpon").parsed;

    expect(parsed).not.toBeNull();
    expect(calculateDamageResults(parsed!)).toHaveLength(3);
  });

  test("forces 0 speed IVs when trick room is parsed", () => {
    const parsed = parseCommand("archaludon !electro-shot ~trick-room x amoonguss").parsed;
    const context = buildCalculationContext(parsed!);

    expect(context?.attackerPokemon.ivs.spe).toBe(0);
  });

  test("emits compact showdown-like damage text without raw rolls", () => {
    const parsed = parseCommand("flutter mane !moonblast x ogerpon").parsed;
    const [result] = calculateDamageResults(parsed!);

    expect(result.damageText).toContain("%");
    expect(result.damageText).toContain("--");
    expect(result.damageText).not.toContain("Rolls:");
  });

  test("applies defender stages to the relevant defensive stat", () => {
    const neutral = parseCommand("flutter mane !moonblast x ogerpon").parsed;
    const boosted = parseCommand("flutter mane !moonblast x ogerpon <+6").parsed;

    const [neutralResult] = calculateDamageResults(neutral!);
    const [boostedResult] = calculateDamageResults(boosted!);

    expect(boostedResult.maxPercentage).toBeLessThan(neutralResult.maxPercentage);
    expect(boostedResult.assumptions).toContain("Defender stage: +6 SpD");
  });

  test("uses current hp percentages and critical hits in the calculation context", () => {
    const parsed = parseCommand("flutter mane !moonblast %75 * x ogerpon %50").parsed;
    const context = buildCalculationContext(parsed!);
    const [result] = calculateDamageResults(parsed!);

    expect(context?.attackerPokemon.curHP()).toBeLessThan(context!.attackerPokemon.maxHP());
    expect(result.contextText.toLowerCase()).toContain("critical hit");
    expect(result.assumptions).toContain("Attacker HP: 75%");
    expect(result.assumptions).toContain("Defender HP: 50%");
    expect(result.assumptions).toContain("Critical hit");
  });

  test("auto max bulk prioritizes the relevant defense for the move category", () => {
    const physicalParsed = parseCommand("incineroar !flare-blitz x tinkaton").parsed;
    const specialParsed = parseCommand("flutter mane !moonblast x tinkaton").parsed;
    const physicalContext = buildCalculationContext(physicalParsed!);
    const specialContext = buildCalculationContext(specialParsed!);

    expect(physicalContext?.archetypes[2]).toMatchObject({
      evs: { hp: 252, def: 252, spd: 4 },
      nature: "Bold",
    });
    expect(specialContext?.archetypes[2]).toMatchObject({
      evs: { hp: 252, def: 4, spd: 252 },
      nature: "Calm",
    });
  });
});
