import { getAutocompleteState } from "@/lib/parser/inline-suggestions";
import type { ImportedSet } from "@/lib/types";

const referencedSets: Record<string, ImportedSet> = {
  garchomp: {
    speciesId: "garchomp",
    speciesName: "Garchomp",
    item: "Clear Amulet",
    ability: "Rough Skin",
    level: 50,
    nature: "Jolly",
    statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ["Earthquake", "Dragon Claw", "Protect", "Stomping Tantrum"],
  },
  gengarmega: {
    speciesId: "gengarmega",
    speciesName: "Gengar-Mega",
    item: "Gengarite",
    ability: "Shadow Tag",
    level: 50,
    nature: "Timid",
    statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
    ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ["Shadow Ball", "Sludge Bomb", "Protect", "Icy Wind"],
  },
};

describe("autocomplete regressions", () => {
  test("preserves a merged follow-up move token when completing a saved set reference", () => {
    const input = "#garch!throat-chop x #gengarmega";
    const result = getAutocompleteState(input, "#garch".length, referencedSets);

    expect(result.suggestionOptions[0]?.value).toBe("#garchomp");
    expect(result.suggestionOptions[0]?.applyText).toBe(
      "#garchomp !throat-chop x #gengarmega",
    );
    expect(result.activeSuggestion?.completionText).toBe(
      "#garchomp !throat-chop x #gengarmega",
    );
  });

  test("inserts an attacker move after the resolved attacker instead of replacing it", () => {
    const input = "#garchomp x #gengarmega";
    const result = getAutocompleteState(
      input,
      "#garchomp".length,
      referencedSets,
    );

    expect(result.suggestionOptions[0]?.value.startsWith("!")).toBe(true);
    expect(result.suggestionOptions[0]?.applyText).toMatch(
      /^#garchomp !.+ x #gengarmega$/,
    );
    expect(result.activeSuggestion?.completionText).toMatch(
      /^#garchomp !.+ x #gengarmega$/,
    );
  });

  test("completes defender species after a gendered attacker form and explicit move", () => {
    const input = "basculegion !last-respects x fr";
    const result = getAutocompleteState(input);
    const values = result.suggestionOptions.map((option) => option.value);

    expect(result.activeSuggestion?.slot).toBe("defender_pokemon");
    expect(values).not.toContain("basculegion");
    expect(values).not.toContain("basculegion-f");
    expect(values.some((value) => value.startsWith("fr"))).toBe(true);
  });

  test("offers explicit Aegislash defender forms without collapsing them to base species", () => {
    const input = "incineroar !flare-blitz x aegislash-s";
    const result = getAutocompleteState(input);
    const values = result.suggestionOptions.map((option) => option.value);

    expect(result.activeSuggestion?.slot).toBe("defender_pokemon");
    expect(values).toContain("aegislash-shield");
    expect(values).toContain("aegislash-blade");
    expect(result.suggestionOptions[0]?.applyText).toBe(
      "incineroar !flare-blitz x aegislash-shield",
    );
  });
});
