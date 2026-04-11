import { buildCalculationContext, calculateDamageResults } from "@/lib/calc/damage-engine";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import { parseCommand } from "@/lib/parser/command-parser";

describe("damage engine", () => {
  test("returns three archetype rows for an explicit symbolic command", () => {
    const parsed = parseCommand("politoed !muddy-water x incineroar").parsed;

    expect(parsed).not.toBeNull();
    expect(calculateDamageResults(parsed!)).toHaveLength(3);
  });

  test("forces 0 speed IVs when trick room is parsed without an explicit set", () => {
    const parsed = parseCommand("politoed !muddy-water ~trick-room x incineroar").parsed;
    const context = buildCalculationContext(parsed!);

    expect(context?.attackerPokemon.ivs.spe).toBe(0);
  });

  test("emits compact showdown-like damage text without raw rolls", () => {
    const parsed = parseCommand("politoed !muddy-water x incineroar").parsed;
    const [result] = calculateDamageResults(parsed!);

    expect(result.damageText).toContain("%");
    expect(result.damageText).toContain("--");
    expect(result.damageText).not.toContain("Rolls:");
  });

  test("applies defender stages to the relevant defensive stat", () => {
    const neutral = parseCommand("politoed !muddy-water x incineroar").parsed;
    const boosted = parseCommand("politoed !muddy-water x incineroar +6").parsed;

    const [neutralResult] = calculateDamageResults(neutral!);
    const [boostedResult] = calculateDamageResults(boosted!);

    expect(boostedResult.maxPercentage).toBeLessThan(neutralResult.maxPercentage);
    expect(boostedResult.assumptions).toContain("Defender stage: +6 SpD");
  });

  test("uses current hp percentages and critical hits in the calculation context", () => {
    const parsed = parseCommand("politoed !muddy-water %75 * x incineroar %50").parsed;
    const context = buildCalculationContext(parsed!);
    const [result] = calculateDamageResults(parsed!);

    expect(context?.attackerPokemon.curHP()).toBeLessThan(context!.attackerPokemon.maxHP());
    expect(result.contextText.toLowerCase()).toContain("critical hit");
    expect(result.assumptions).toContain("Attacker HP: 75%");
    expect(result.assumptions).toContain("Defender HP: 50%");
    expect(result.assumptions).toContain("Critical hit");
  });

  test("applies burn to physical attacker damage", () => {
    const neutral = parseCommand("incineroar !flare-blitz x tinkaton").parsed;
    const burned = parseCommand("incineroar !flare-blitz burn x tinkaton").parsed;

    const [neutralResult] = calculateDamageResults(neutral!);
    const [burnedResult] = calculateDamageResults(burned!);

    expect(burnedResult.maxPercentage).toBeLessThan(neutralResult.maxPercentage);
    expect(burnedResult.assumptions).toContain("Attacker status: Burn");
  });

  test("uses the averaged default hit count for variable multi-hit moves", () => {
    const parsed = parseCommand("maushold !population-bomb x incineroar").parsed;
    const [result] = calculateDamageResults(parsed!);

    expect(result.assumptions).toContain("Assumed hits: 10");
  });

  test("respects explicit multi-hit counts in the prompt", () => {
    const defaultParsed = parseCommand("maushold !population-bomb x incineroar").parsed;
    const explicitParsed = parseCommand("maushold !population-bomb(2) x incineroar").parsed;

    const [defaultResult] = calculateDamageResults(defaultParsed!);
    const [explicitResult] = calculateDamageResults(explicitParsed!);

    expect(explicitResult.maxPercentage).toBeLessThan(defaultResult.maxPercentage);
    expect(explicitResult.assumptions).toContain("Hits: 2");
  });

  test("applies attacker and defender speed stages to speed-based move calculations", () => {
    const slower = parseCommand("tinkaton !gyro-ball spe-6 x incineroar spe+6").parsed;
    const faster = parseCommand("tinkaton !gyro-ball spe+6 x incineroar spe-6").parsed;

    const [slowerResult] = calculateDamageResults(slower!);
    const [fasterResult] = calculateDamageResults(faster!);

    expect(slowerResult.maxPercentage).toBeGreaterThan(fasterResult.maxPercentage);
    expect(fasterResult.assumptions).toContain("Attacker speed stage: +6 Spe");
    expect(fasterResult.assumptions).toContain("Defender speed stage: -6 Spe");
  });

  test("does not crash when calc desc fails on a no-damage interaction", () => {
    const parsed = parseCommand("incineroar !fake-out x mimikyu").parsed;

    expect(() => calculateDamageResults(parsed!)).not.toThrow();

    const [result] = calculateDamageResults(parsed!);
    expect(result.damageText).toContain("0-0");
  });

  test("auto max bulk prioritizes the relevant defense for the move category", () => {
    const physicalParsed = parseCommand("incineroar !flare-blitz x tinkaton").parsed;
    const specialParsed = parseCommand("politoed !muddy-water x tinkaton").parsed;
    const physicalContext = buildCalculationContext(physicalParsed!);
    const specialContext = buildCalculationContext(specialParsed!);

    expect(physicalContext?.archetypes[2]).toMatchObject({
      evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
      nature: "Bold",
    });
    expect(specialContext?.archetypes[2]).toMatchObject({
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
      nature: "Calm",
    });
  });

  test("does not resolve mega evolution from a mega stone item alone", () => {
    const parsed = parseCommand("charizard !heat-wave @charizardite-y x tinkaton").parsed;
    const context = buildCalculationContext(parsed!);

    expect(context?.attacker.name).toBe("Charizard");
    expect(context?.attackerAbility).toBe("Blaze");
  });

  test("resolves mega evolution only when the mega form is explicit in the prompt", () => {
    const parsed = parseCommand("charizard-mega-y !heat-wave @charizardite-y x tinkaton").parsed;
    const context = buildCalculationContext(parsed!);

    expect(context?.attacker.name).toBe("Charizard-Mega-Y");
    expect(context?.attackerAbility).toBe("Drought");
  });

  test("only Floette-Eternal can access Floette-Mega", () => {
    const regular = parseCommand("floette !moonblast @floettite x incineroar").parsed;
    const eternalBase = parseCommand("floette eternal flower !moonblast @floettite x incineroar").parsed;
    const eternalMega = parseCommand("floette-mega !moonblast @floettite x incineroar").parsed;

    const regularContext = buildCalculationContext(regular!);
    const eternalBaseContext = buildCalculationContext(eternalBase!);
    const eternalMegaContext = buildCalculationContext(eternalMega!);

    expect(regularContext?.attacker.name).toBe("Floette");
    expect(eternalBaseContext?.attacker.name).toBe("Floette-Eternal");
    expect(eternalMegaContext?.attacker.name).toBe("Floette-Mega");
  });

  test("does not assume mega abilities for a base species without its mega stone", () => {
    const parsed = parseCommand("charizard !heat-wave x tinkaton").parsed;
    const context = buildCalculationContext(parsed!);

    expect(context?.attacker.name).toBe("Charizard");
    expect(context?.attackerAbility).toBe("Blaze");
  });

  test("applies defender items that mitigate or bulk special damage", () => {
    const neutral = parseCommand("charizard !heat-wave x tinkaton").parsed;
    const occa = parseCommand("charizard !heat-wave x tinkaton @occa-berry").parsed;
    const vest = parseCommand("charizard !heat-wave x tinkaton @assault-vest").parsed;

    const [neutralResult] = calculateDamageResults(neutral!);
    const [occaResult] = calculateDamageResults(occa!);
    const [vestResult] = calculateDamageResults(vest!);

    expect(occaResult.maxPercentage).toBeLessThan(neutralResult.maxPercentage);
    expect(vestResult.maxPercentage).toBeLessThan(neutralResult.maxPercentage);
    expect(occaResult.assumptions).toContain("Defender item: Occa Berry");
    expect(vestResult.assumptions).toContain("Defender item: Assault Vest");
  });

  test("uses imported attacker sets in the damage calculation", () => {
    const parsed = parseCommand("politoed !muddy-water x incineroar").parsed;
    const importedSets = {
      politoed: createImportedSet({
        speciesId: "politoed",
        speciesName: "Politoed",
        item: "Mystic Water",
        ability: "Drizzle",
        nature: "Modest",
        statPoints: {
          hp: 32,
          atk: 0,
          def: 1,
          spa: 13,
          spd: 1,
          spe: 19,
        },
        moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
      }),
    };

    const context = buildCalculationContext(parsed!, importedSets);
    const [result] = calculateDamageResults(parsed!, importedSets);

    expect(context?.attackerPokemon.item).toBe("Mystic Water");
    expect(context?.attackerPokemon.nature).toBe("Modest");
    expect(result.assumptions).toContain("Set item: Mystic Water");
    expect(result.assumptions).toContain("Set ability: Drizzle");
  });

  test("uses imported defender sets as an explicit custom bulk row", () => {
    const parsed = parseCommand("politoed !muddy-water x incineroar").parsed;
    const importedSets = {
      incineroar: createImportedSet({
        speciesId: "incineroar",
        speciesName: "Incineroar",
        item: "Assault Vest",
        ability: "Intimidate",
        nature: "Careful",
        statPoints: {
          hp: 32,
          atk: 0,
          def: 8,
          spa: 0,
          spd: 16,
          spe: 10,
        },
        moves: ["Flare Blitz", "Knock Off", "Parting Shot", "Fake Out"],
      }),
    };

    const context = buildCalculationContext(parsed!, importedSets);
    const results = calculateDamageResults(parsed!, importedSets);

    expect(context?.archetypes).toHaveLength(1);
    expect(context?.archetypes[0]?.label).toBe("Custom Set");
    expect(results).toHaveLength(1);
    expect(results[0].assumptions).toContain("Defender set item: Assault Vest");
  });
});
