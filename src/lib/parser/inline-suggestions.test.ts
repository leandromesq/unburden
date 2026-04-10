import {
  getAutocompleteState,
  getContextualMoveSuggestions,
  getInlineSuggestion,
} from "@/lib/parser/inline-suggestions";

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
});
