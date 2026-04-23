import {
  getAutocompleteState,
  getContextualMoveSuggestions,
  getInlineSuggestion,
} from "@/lib/parser/inline-suggestions";
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

describe("inline suggestions", () => {
  test("suggests attacker pokemon completion while typing", () => {
    const result = getInlineSuggestion("poli");

    expect(result.ghostText).toBe("toed");
    expect(result.completionText).toBe("politoed");
  });

  test("suggests canonical move token after the attacker is resolved", () => {
    const result = getAutocompleteState("politoed mud");

    expect(result.suggestionOptions[0]?.value).toBe("!muddy-water");
    expect(result.activeSuggestion?.completionText).toBe("politoed !muddy-water");
  });

  test("continues an explicit move token inline", () => {
    const result = getInlineSuggestion("politoed !muddy-w");

    expect(result.ghostText).toBe("ater");
    expect(result.completionText).toBe("politoed !muddy-water");
  });

  test("suggests the separator after an explicit move", () => {
    const result = getInlineSuggestion("politoed !muddy-water ");

    expect(result.ghostText).toBe("x");
    expect(result.completionText).toBe("politoed !muddy-water x ");
  });

  test("suggests defender pokemon completion after the separator", () => {
    const result = getInlineSuggestion("politoed !muddy-water x inc");

    expect(result.ghostText.length).toBeGreaterThan(0);
    expect(result.completionText).toContain("incineroar");
  });

  test("returns ranked canonical move tokens for the resolved attacker", () => {
    const result = getContextualMoveSuggestions("politoed x incineroar");

    expect(result).toContain("!muddy-water");
    expect(result).toContain("!weather-ball");
  });

  test("reuses the base species meta for explicit mega forms", () => {
    const result = getContextualMoveSuggestions("charizard mega y x tinkaton");

    expect(result).toContain("!heat-wave");
    expect(result).toContain("!solar-beam");
  });

  test("formats mega forms with hyphens in autocomplete completions", () => {
    const result = getAutocompleteState("charizard-mega");

    expect(result.activeSuggestion?.completionText).toMatch(/^charizard-mega-[xy]$/);
  });

  test("uses the cursor position instead of the final auto token for defender completion", () => {
    const input = "politoed !muddy-water x incineroa ~rain";
    const cursorIndex = input.indexOf(" ~rain");
    const result = getAutocompleteState(input, cursorIndex);

    expect(result.activeSuggestion?.completionText).toContain("incineroar");
    expect(result.suggestionOptions[0]?.label).toBe("Incineroar");
  });

  test("suggests saved set references while typing #", () => {
    const result = getAutocompleteState("#rai", 4, referencedSets);

    expect(result.suggestionOptions[0]?.value).toBe("#raintoed");
    expect(result.suggestionOptions[0]?.label).toContain("rain-toed");
  });

  test("uses saved set references as resolved attacker context for move suggestions", () => {
    const result = getAutocompleteState("#raintoed mud", "#raintoed mud".length, referencedSets);

    expect(result.suggestionOptions[0]?.value).toBe("!muddy-water");
    expect(result.activeSuggestion?.completionText).toBe("#raintoed !muddy-water");
  });

  test("uses saved set references as the resolved attacker for contextual move suggestions", () => {
    const result = getContextualMoveSuggestions("#raintoed x incineroar", referencedSets);

    expect(result).toContain("!muddy-water");
    expect(result).toContain("!weather-ball");
  });

  test("returns no contextual move suggestions when the attacker cannot be resolved", () => {
    expect(getContextualMoveSuggestions("notapokemon x incineroar")).toEqual([]);
  });

  test("prioritizes common negative multipliers over extreme values", () => {
    const result = getAutocompleteState("politoed !muddy-water -");

    expect(result.suggestionOptions[0]?.value).toBe("-1");
    expect(result.suggestionOptions[1]?.value).toBe("-2");
  });

  test("suggests explicit nature names while typing modifier tokens", () => {
    const result = getAutocompleteState("politoed !muddy-water tim");

    expect(result.suggestionOptions[0]?.value).toBe("timid");
    expect(result.activeSuggestion?.completionText).toBe(
      "politoed !muddy-water timid",
    );
  });

  test("suggests pre-move attacker modifiers after the pokemon is resolved", () => {
    const result = getAutocompleteState("excadrill spe");

    expect(result.suggestionOptions[0]?.value).toBe("spe+1");
    expect(result.suggestionOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "spe-1" }),
      ]),
    );
  });

  test("keeps bare move suggestions working after a pre-move attacker modifier", () => {
    const result = getAutocompleteState("excadrill spe-1 iro");

    expect(result.suggestionOptions[0]?.value).toBe("!iron-head");
    expect(result.activeSuggestion?.completionText).toBe(
      "excadrill !iron-head spe-1",
    );
  });
});
