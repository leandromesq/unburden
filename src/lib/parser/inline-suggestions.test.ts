import {
  getAutocompleteState,
  getContextualMoveSuggestions,
  getInlineSuggestion,
} from "@/lib/parser/inline-suggestions";

describe("inline suggestions", () => {
  test("suggests attacker pokemon completion while typing", () => {
    const result = getInlineSuggestion("flutter m");

    expect(result.ghostText).toBe("ane");
    expect(result.completionText).toBe("flutter mane");
  });

  test("suggests canonical move token after the attacker is resolved", () => {
    const result = getAutocompleteState("flutter mane mo");

    expect(result.suggestionOptions[0]?.value).toBe("!moonblast");
    expect(result.activeSuggestion?.completionText).toBe("flutter mane !moonblast");
  });

  test("continues an explicit move token inline", () => {
    const result = getInlineSuggestion("flutter mane !moonb");

    expect(result.ghostText).toBe("last");
    expect(result.completionText).toBe("flutter mane !moonblast");
  });

  test("suggests the separator after an explicit move", () => {
    const result = getInlineSuggestion("flutter mane !moonblast ");

    expect(result.ghostText).toBe("x");
    expect(result.completionText).toBe("flutter mane !moonblast x ");
  });

  test("suggests defender pokemon completion after the separator", () => {
    const result = getInlineSuggestion("flutter mane !moonblast x og");

    expect(result.ghostText.length).toBeGreaterThan(0);
    expect(result.completionText).toContain("ogerpon");
  });

  test("returns ranked canonical move tokens for the resolved attacker", () => {
    const result = getContextualMoveSuggestions("incineroar x tinkaton");

    expect(result).toContain("!flare-blitz");
    expect(result).toContain("!fake-out");
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
});
