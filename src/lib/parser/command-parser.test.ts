import { parseCommand } from "@/lib/parser/command-parser";
import type { ImportedSet } from "@/lib/types";

const referencedSets: Record<string, ImportedSet> = {
  politoed: {
    speciesId: "politoed",
    speciesName: "Politoed",
    nickname: "rain-toed",
    item: "Mystic Water",
    ability: "Drizzle",
    level: 50,
    nature: "Modest",
    statPoints: { hp: 32, atk: 0, def: 1, spa: 13, spd: 1, spe: 19 },
    evs: { hp: 252, atk: 0, def: 8, spa: 104, spd: 8, spe: 152 },
    ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ["Muddy Water", "Ice Beam", "Protect", "Helping Hand"],
  },
};

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
    expect(result.issues).toContainEqual({ id: "parser.add_attacker_move" });
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
      "politoed !muddy-water @mystic-water x incineroar @leftovers",
    );

    expect(result.parsed).toMatchObject({
      attackerItem: "Mystic Water",
      defenderItem: "Leftovers",
    });
    expect(result.issues).toHaveLength(0);
  });

  test("accepts legal Champions items even when they are not top-meta defaults", () => {
    const result = parseCommand(
      "garchomp !stomping-tantrum @soft-sand x tinkaton @occa-berry",
    );

    expect(result.parsed).toMatchObject({
      attackerItem: "Soft Sand",
      defenderItem: "Occa Berry",
    });
    expect(result.issues).toHaveLength(0);
  });

  test("reports unknown items on both sides without dropping the resolved command", () => {
    const result = parseCommand(
      "politoed qqqqq !muddy-water @fake-item x incineroar @fake-item",
    );

    expect(result.parsed).toMatchObject({
      attacker: "Politoed",
      move: "Muddy Water",
      defender: "Incineroar",
      attackerItem: undefined,
      defenderItem: undefined,
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { id: "parser.unknown_attacker_item", values: { token: "@fake-item" } },
        { id: "parser.unknown_defender_item", values: { token: "@fake-item" } },
      ]),
    );
  });

  test("reports invalid multi-hit counts on explicit move tokens", () => {
    const result = parseCommand("maushold !population-bomb(12) x incineroar");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContainEqual({
      id: "parser.invalid_move_hit_count",
    });
  });

  test("keeps the command but flags abilities that are invalid for each side", () => {
    const result = parseCommand(
      "politoed !muddy-water [Intimidate] x incineroar [Drizzle]",
    );

    expect(result.parsed).toMatchObject({
      attacker: "Politoed",
      move: "Muddy Water",
      defender: "Incineroar",
      attackerAbility: undefined,
      defenderAbility: undefined,
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { id: "parser.could_not_resolve_attacker_ability" },
        { id: "parser.could_not_resolve_defender_ability" },
      ]),
    );
  });

  test("accepts fuzzy pokemon and move resolution inside symbolic grammar", () => {
    const result = parseCommand("politoe !mudy-water x incineroar");

    expect(result.parsed).toMatchObject({
      attacker: "Politoed",
      move: "Muddy Water",
      defender: "Incineroar",
    });
  });

  test("parses legal live-roster species like Heliolisk", () => {
    const result = parseCommand("heliolisk !thunderbolt x incineroar");

    expect(result.parsed).toMatchObject({
      attacker: "Heliolisk",
      move: "Thunderbolt",
      defender: "Incineroar",
    });
    expect(result.issues).toHaveLength(0);
  });

  test("rejects low-confidence unresolved inputs", () => {
    const result = parseCommand("zzzzzz !muddy-water x incineroar");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContainEqual({
      id: "parser.could_not_resolve_attacker",
    });
  });

  test("does not resolve incomplete defender prompts", () => {
    const result = parseCommand("aegislash !poltergeist x ");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContainEqual({
      id: "parser.could_not_resolve_defender",
    });
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

  test("accepts explicit nature names for attacker and defender", () => {
    const result = parseCommand(
      "politoed !muddy-water timid x incineroar calm",
    );

    expect(result.parsed).toMatchObject({
      attackerNature: "Timid",
      defenderNature: "Calm",
    });
  });

  test("prefers explicit nature names over representative +nature tokens", () => {
    const result = parseCommand(
      "politoed !muddy-water +nature timid x incineroar +nature calm",
    );

    expect(result.parsed).toMatchObject({
      attackerNature: "Timid",
      defenderNature: "Calm",
    });
  });

  test("maps attacker +nature to a defense-boosting nature for body press", () => {
    const result = parseCommand("archaludon !body-press +nature x incineroar");

    expect(result.parsed).toMatchObject({
      attackerNature: "Impish",
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

  test("parses explicit named stage tokens for all combat stats", () => {
    const result = parseCommand(
      "archaludon !body-press atk-1 def+3 spa+2 spd-2 spe+1 x incineroar atk+2 def-1 spa-3 spd+4 spe-2",
    );

    expect(result.parsed).toMatchObject({
      attackerStageMods: {
        hp: 0,
        atk: -1,
        def: 3,
        spa: 2,
        spd: -2,
        spe: 1,
      },
      defenderStageMods: {
        hp: 0,
        atk: 2,
        def: -1,
        spa: -3,
        spd: 4,
        spe: -2,
      },
      attackerSpeedMod: 1,
      defenderSpeedMod: -2,
    });
  });

  test("parses attacker modifiers declared before the move token", () => {
    const result = parseCommand(
      "excadrill spe-1 @focus-sash !iron-head x incineroar",
    );

    expect(result.parsed).toMatchObject({
      attacker: "Excadrill",
      move: "Iron Head",
      defender: "Incineroar",
      attackerItem: "Focus Sash",
      attackerSpeedMod: -1,
    });
    expect(result.issues).toHaveLength(0);
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

  test("parses zero current hp percentages", () => {
    const result = parseCommand("politoed !muddy-water %0 x incineroar");

    expect(result.parsed).toMatchObject({
      attackerCurrentHpPercent: 0,
    });
  });

  test("parses explicit SP spreads by segment", () => {
    const result = parseCommand(
      "politoed !muddy-water sp:32/0/1/13/1/19 x incineroar sp:32/0/12/0/22/0",
    );

    expect(result.parsed).toMatchObject({
      attackerStatPoints: { hp: 32, atk: 0, def: 1, spa: 13, spd: 1, spe: 19 },
      defenderStatPoints: { hp: 32, atk: 0, def: 12, spa: 0, spd: 22, spe: 0 },
    });
    expect(result.issues).toHaveLength(0);
  });

  test("only applies saved sets when referenced with #set", () => {
    const plain = parseCommand(
      "politoed !muddy-water x incineroar",
      referencedSets,
    );
    const referenced = parseCommand(
      "#rain-toed x incineroar",
      referencedSets,
    );

    expect(plain.parsed).toMatchObject({
      attacker: "Politoed",
      attackerSetReferenceId: undefined,
    });
    expect(referenced.parsed).toMatchObject({
      attacker: "Politoed",
      attackerSetReferenceId: "politoed",
      move: "Muddy Water",
    });
  });

  test("parses side modifiers directly after a saved set reference", () => {
    const result = parseCommand(
      "#rain-toed max-spa +nature x incineroar",
      referencedSets,
    );

    expect(result.parsed).toMatchObject({
      attacker: "Politoed",
      attackerSetReferenceId: "politoed",
      move: "Muddy Water",
      attackerInvestment: "max_spa",
      attackerNature: "Modest",
    });
    expect(result.issues).not.toContainEqual({
      id: "parser.saved_set_reference_attacker_slot_only",
    });
  });

  test("rejects malformed SP spreads", () => {
    const result = parseCommand("politoed !muddy-water sp:32/0/1 x incineroar");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContainEqual({ id: "parser.invalid_spread" });
  });

  test("parses attacker and defender status conditions by segment", () => {
    const result = parseCommand(
      "incineroar !flare-blitz burn x tinkaton paralysis",
    );

    expect(result.parsed).toMatchObject({
      attackerStatus: "brn",
      defenderStatus: "par",
    });
  });

  test("parses explicit multi-hit counts on attacker moves", () => {
    const result = parseCommand("maushold !population-bomb(4) x incineroar");

    expect(result.parsed).toMatchObject({
      attacker: "Maushold",
      move: "Population Bomb",
      moveHitCount: 4,
      defender: "Incineroar",
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

  test("supports explicit Aegislash blade and shield forms as calc overrides", () => {
    const result = parseCommand("aegislash blade !poltergeist x aegislash shield");

    expect(result.parsed).toMatchObject({
      attacker: "Aegislash",
      defender: "Aegislash",
      attackerCalcFormId: "aegislashblade",
      defenderCalcFormId: "aegislashshield",
    });
  });

  test("rejects removed legacy side prefixes", () => {
    const result = parseCommand("politoed !muddy-water >+1 x incineroar");

    expect(result.parsed).toBeNull();
    expect(result.issues).toContainEqual({
      id: "parser.legacy_prefixes_removed",
    });
  });

  test("does not treat the x in mega x as the attacker-defender separator", () => {
    const result = parseCommand("charizard mega x !heat-wave x tinkaton");

    expect(result.parsed).toMatchObject({
      attacker: "Charizard-Mega-X",
      move: "Heat Wave",
      defender: "Tinkaton",
    });
  });

  test("resolves saved set references by nickname and uses the saved move when omitted", () => {
    const result = parseCommand("#rain-toed x incineroar", referencedSets);

    expect(result.parsed).toMatchObject({
      attacker: "Politoed",
      defender: "Incineroar",
      move: "Muddy Water",
    });
  });

  test("reports unknown saved set references", () => {
    const result = parseCommand("#missing-set x incineroar", referencedSets);

    expect(result.parsed).toBeNull();
    expect(result.issues).toContainEqual({
      id: "parser.unknown_saved_set_reference",
      values: { reference: "#missing-set" },
    });
  });
});
