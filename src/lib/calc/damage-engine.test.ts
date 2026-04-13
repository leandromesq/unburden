import {
  buildCalculationContext,
  calculateDamageResults,
  getCalculationIssues,
} from "@/lib/calc/damage-engine";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import { parseCommand } from "@/lib/parser/command-parser";

describe("damage engine", () => {
  test("returns three archetype rows for an explicit symbolic command", () => {
    const parsed = parseCommand("politoed !muddy-water x incineroar").parsed;

    expect(parsed).not.toBeNull();
    expect(calculateDamageResults(parsed!)).toHaveLength(3);
  });

  test("always assumes max IVs even under trick room", () => {
    const parsed = parseCommand("politoed !muddy-water ~trick-room x incineroar").parsed;
    const context = buildCalculationContext(parsed!);

    expect(context?.attackerPokemon.ivs.spe).toBe(31);
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
    expect(fasterResult.assumptions.some((assumption) => assumption.startsWith("Attacker Spe: "))).toBe(true);
    expect(fasterResult.assumptions.some((assumption) => assumption.startsWith("Defender Spe: "))).toBe(true);
    expect(fasterResult.assumptions.some((assumption) => assumption.startsWith("Speed ratio: "))).toBe(true);
  });

  test("does not crash when calc desc fails on a no-damage interaction", () => {
    const parsed = parseCommand("incineroar !fake-out x mimikyu").parsed;

    expect(() => calculateDamageResults(parsed!)).not.toThrow();

    const [result] = calculateDamageResults(parsed!);
    expect(result.damageText).toContain("0-0");
  });

  test("maps Aegislash to a calc-supported form instead of crashing", () => {
    const parsed = parseCommand("aegislash !poltergeist x incineroar").parsed;

    expect(parsed).not.toBeNull();
    expect(() => calculateDamageResults(parsed!)).not.toThrow();
    expect(calculateDamageResults(parsed!)).toHaveLength(3);
  });

  test("defaults Aegislash to Blade as attacker and Shield as defender", () => {
    const attackerParsed = parseCommand("aegislash !poltergeist x incineroar").parsed;
    const defenderParsed = parseCommand("incineroar !flare-blitz x aegislash").parsed;
    const attackerContext = buildCalculationContext(attackerParsed!);
    const defenderContext = buildCalculationContext(defenderParsed!);

    expect(attackerContext?.attackerCalcSpeciesName).toBe("Aegislash-Blade");
    expect(defenderContext?.defenderCalcSpeciesName).toBe("Aegislash-Shield");
  });

  test("respects explicitly stated Aegislash forms", () => {
    const parsed = parseCommand("aegislash shield !shadow-ball x aegislash blade").parsed;
    const context = buildCalculationContext(parsed!);

    expect(context?.attackerCalcSpeciesName).toBe("Aegislash-Shield");
    expect(context?.defenderCalcSpeciesName).toBe("Aegislash-Blade");
  });

  test("assumes a defender item for Poltergeist when none is explicit", () => {
    const parsed = parseCommand("aegislash !poltergeist x incineroar").parsed;
    const [result] = calculateDamageResults(parsed!);

    expect(result.damageText).not.toContain("0-0");
    expect(result.assumptions.some((assumption) => assumption.startsWith("Assumed defender item:"))).toBe(true);
  });

  test("strict mode blocks calculations that rely on inferred abilities", () => {
    const parsed = parseCommand("politoed !muddy-water x incineroar").parsed;

    expect(getCalculationIssues(parsed!, {}, { strictMode: true })).toContain(
      "Strict mode: add an explicit attacker ability or use a set with an ability.",
    );
    expect(calculateDamageResults(parsed!, {}, { strictMode: true })).toHaveLength(0);
  });

  test("strict mode allows calculations when abilities are explicit", () => {
    const parsed = parseCommand(
      "politoed !muddy-water [Drizzle] x incineroar [Intimidate]",
    ).parsed;

    expect(getCalculationIssues(parsed!, {}, { strictMode: true })).toHaveLength(0);
    expect(calculateDamageResults(parsed!, {}, { strictMode: true })).toHaveLength(3);
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
    const leftovers = parseCommand("charizard !heat-wave x tinkaton @leftovers").parsed;

    const [neutralResult] = calculateDamageResults(neutral!);
    const [occaResult] = calculateDamageResults(occa!);
    const [leftoversResult] = calculateDamageResults(leftovers!);

    expect(occaResult.maxPercentage).toBeLessThan(neutralResult.maxPercentage);
    expect(leftoversResult.assumptions).toContain("Defender item: Leftovers");
    expect(occaResult.assumptions).toContain("Defender item: Occa Berry");
  });

  test("uses referenced attacker sets in the damage calculation", () => {
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
    const parsed = parseCommand("#politoed x incineroar", importedSets).parsed;

    const context = buildCalculationContext(parsed!, importedSets);
    const [result] = calculateDamageResults(parsed!, importedSets);

    expect(context?.attackerPokemon.item).toBe("Mystic Water");
    expect(context?.attackerPokemon.nature).toBe("Modest");
    expect(result.assumptions).toContain("Set item: Mystic Water");
    expect(result.assumptions).toContain("Set ability: Drizzle");
  });

  test("uses prompt SP overrides in the damage calculation", () => {
    const lower = parseCommand(
      "politoed !muddy-water sp:0/0/0/0/0/0 x incineroar",
    ).parsed;
    const higher = parseCommand(
      "politoed !muddy-water sp:32/0/1/32/1/0 x incineroar",
    ).parsed;

    const [lowerResult] = calculateDamageResults(lower!);
    const [higherResult] = calculateDamageResults(higher!);

    expect(higherResult.maxPercentage).toBeGreaterThan(lowerResult.maxPercentage);
  });

  test("uses prompt defender SPs as a single custom set row", () => {
    const parsed = parseCommand(
      "politoed !muddy-water x incineroar sp:32/0/12/0/22/0",
    ).parsed;
    const context = buildCalculationContext(parsed!);
    const results = calculateDamageResults(parsed!);

    expect(context?.archetypes).toHaveLength(1);
    expect(context?.archetypes[0]?.label).toBe("Custom Set");
    expect(results).toHaveLength(1);
  });

  test("uses referenced defender sets as an explicit custom bulk row", () => {
    const importedSets = {
      incineroar: createImportedSet({
        speciesId: "incineroar",
        speciesName: "Incineroar",
        item: "Leftovers",
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
    const parsed = parseCommand("politoed !muddy-water x #incineroar", importedSets).parsed;

    const context = buildCalculationContext(parsed!, importedSets);
    const results = calculateDamageResults(parsed!, importedSets);

    expect(context?.archetypes).toHaveLength(1);
    expect(context?.archetypes[0]?.label).toBe("Custom Set");
    expect(results).toHaveLength(1);
    expect(results[0].assumptions).toContain("Defender set item: Leftovers");
  });
});
