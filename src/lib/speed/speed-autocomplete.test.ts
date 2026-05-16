import {
  applySpeedAutocompleteOption,
  getDefaultSpeedPokemonSuggestions,
  getSpeedAutocompleteOptions,
} from "@/lib/speed/speed-autocomplete";
import { legalPokemonData } from "@/lib/data/pokemon";

describe("speed autocomplete", () => {
  test("blank suggestions only include legal Pokemon", () => {
    const legalIds = new Set(legalPokemonData.map((pokemon) => pokemon.id));

    expect(
      getDefaultSpeedPokemonSuggestions().every((pokemon) =>
        legalIds.has(pokemon.id),
      ),
    ).toBe(true);
  });

  test("suggests legal Pokemon while typing", () => {
    const options = getSpeedAutocompleteOptions("basc");
    const legalIds = new Set(legalPokemonData.map((pokemon) => pokemon.id));

    expect(options[0]?.type).toBe("pokemon");
    expect(options[0]?.value).toContain("Basculegion");
    expect(
      options.every((option) =>
        legalIds.has(
          legalPokemonData.find((pokemon) => pokemon.name === option.value)?.id ?? "",
        ),
      ),
    ).toBe(true);
  });

  test("suggests speed modifiers and applies canonical text", () => {
    const options = getSpeedAutocompleteOptions("basculegion ");
    const plusSpeed = options.find((option) => option.value === "+speed");

    expect(plusSpeed).toBeTruthy();
    expect(applySpeedAutocompleteOption("basculegion ", plusSpeed!))
      .toBe("basculegion +speed ");
  });

  test("does not suggest a second speed nature modifier", () => {
    const options = getSpeedAutocompleteOptions("basculegion +speed ");

    expect(options.some((option) => option.value === "+speed")).toBe(false);
    expect(options.some((option) => option.value === "-speed")).toBe(false);
    expect(options.some((option) => option.value === "neutral")).toBe(false);
  });
});
